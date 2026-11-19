import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, Printer, Smartphone, Undo2, User } from "lucide-react";
import * as XLSX from "xlsx";
import Modal from "./Modal";
import { descargarExcel, exportarExcel, formatearFechaCelda, imprimirTabla } from "../lib/api";
import { REGEX_RASTRO } from "../lib/device";

export interface HistItem {
  fecha: string;
  usuario: string;
  operacion: string;
  material: string;
  cantidad: number;
  uso: string;
  rastro: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  usuarioActual: string;
  onDevolucionRapida: (it: HistItem) => Promise<boolean>;
}

export default function HistoryModal({ open, onClose, usuarioActual, onDevolucionRapida }: Props) {
  const [data, setData] = useState<HistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [filtro, setFiltro] = useState("");
  const [soloMios, setSoloMios] = useState(false);

  const cargar = () => {
    setLoading(true);
    setMsg("");
    descargarExcel()
      .then((wb) => {
        if (!wb.SheetNames.includes("Historial")) {
          setData([]);
          setMsg("No hay historial registrado aún.");
          return;
        }
        const json = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Historial"], { header: 1 });
        const out: HistItem[] = [];
        for (let i = 1; i < json.length; i++) {
          const r = json[i];
          if (r && r[0]) {
            const usoRaw = String(r[5] ?? "");
            const m = usoRaw.match(REGEX_RASTRO);
            out.push({
              fecha: formatearFechaCelda(r[0]),
              usuario: String(r[1] ?? ""),
              operacion: String(r[2] ?? "").toUpperCase(),
              material: String(r[3] ?? ""),
              cantidad: r[4] !== undefined ? parseFloat(String(r[4])) || 0 : 0,
              uso: m ? usoRaw.replace(REGEX_RASTRO, "") : usoRaw,
              rastro: m ? m[0].trim().replace(/^\[|\]$/g, "") : "",
            });
          }
        }
        setData(out);
      })
      .catch((e) => setMsg("Error: " + e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const usuarios = useMemo(() => [...new Set(data.map((d) => d.usuario))].sort(), [data]);
  const filtrado = useMemo(() => {
    let d = data;
    if (soloMios) d = d.filter((x) => x.usuario.toUpperCase() === usuarioActual.toUpperCase());
    else if (filtro) d = d.filter((x) => x.usuario === filtro);
    return [...d].reverse();
  }, [data, filtro, soloMios, usuarioActual]);

  const enc = ["Fecha", "Usuario", "Operación", "Material", "Cant.", "Uso", "Dispositivo"];
  const filas = () => filtrado.map((d) => [d.fecha, d.usuario, d.operacion, d.material, d.cantidad, d.uso, d.rastro]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Historial de Movimientos"
      toolbar={
        <>
          <select className="input sm:max-w-xs" value={filtro} disabled={soloMios} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-slate-900" checked={soloMios} onChange={(e) => setSoloMios(e.target.checked)} />
            <User size={15} /> Solo mis movimientos
          </label>
        </>
      }
      footer={
        <>
          <button className="btn btn-success" disabled={!filtrado.length} onClick={() => exportarExcel(enc, filas(), "Historial_de_Movimientos")}>
            <FileSpreadsheet size={16} /> Exportar
          </button>
          <button className="btn btn-secondary" disabled={!filtrado.length} onClick={() => imprimirTabla("Reporte de Movimientos - ENERSA", enc, filas())}>
            <Printer size={16} /> Imprimir
          </button>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {["Fecha", "Usuario", "Operación", "Material", "Cant.", "Uso", ""].map((h, i) => (
                <th key={i} className="sticky top-0 bg-slate-50 px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500"><Loader2 className="mx-auto animate-spin" /> Cargando...</td></tr>
            ) : msg ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">{msg}</td></tr>
            ) : filtrado.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">No hay movimientos para este filtro.</td></tr>
            ) : (
              filtrado.map((d, i) => {
                const retiro = d.operacion === "RETIRO";
                return (
                  <tr key={i} className={`border-b border-slate-100 align-top hover:bg-slate-50 ${retiro ? "font-medium text-slate-900" : "text-slate-500"}`}>
                    <td className="whitespace-nowrap px-3 py-3">{d.fecha}</td>
                    <td className="px-3 py-3">{d.usuario}</td>
                    <td className={`px-3 py-3 ${retiro ? "text-red-500" : "text-emerald-600"}`}>{d.operacion}</td>
                    <td className="px-3 py-3">{d.material}</td>
                    <td className="px-3 py-3">{d.cantidad}</td>
                    <td className="px-3 py-3">
                      {d.uso}
                      {d.rastro && (
                        <div className="mt-1 flex items-start gap-1 font-mono text-[10px] font-normal leading-tight text-slate-400">
                          <Smartphone size={11} className="mt-px shrink-0" /> {d.rastro}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {retiro && (
                        <button
                          title="Devolver"
                          className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          onClick={async () => {
                            const ok = await onDevolucionRapida(d);
                            if (ok) setTimeout(cargar, 2500);
                          }}
                        >
                          <Undo2 size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
