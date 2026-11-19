import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, FileSpreadsheet, Loader2, Lock, Printer, Search, Unlock } from "lucide-react";
import * as XLSX from "xlsx";
import Modal from "./Modal";
import { CONFIG, descargarExcel, exportarExcel, imprimirTabla } from "../lib/api";
import { sha256 } from "../lib/sha256";

interface StockItem {
  nombre: string;
  especificacion: string;
  unidad: string;
  cantidad: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  unlocked: boolean;
  setUnlocked: (v: boolean) => void;
  onToast: (m: string, e?: boolean) => void;
}

export default function StockModal({ open, onClose, unlocked, setUnlocked, onToast }: Props) {
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [shake, setShake] = useState(false);
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) {
      setPass("");
      setPassError("");
      setShowPass(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !unlocked) return;
    setQ("");
    setLoading(true);
    setError("");
    descargarExcel()
      .then((wb) => {
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
        const out: StockItem[] = [];
        for (let i = 2; i < json.length; i++) {
          const r = json[i];
          if (r && r[0]) {
            out.push({
              nombre: String(r[0] ?? ""),
              especificacion: String(r[1] ?? ""),
              unidad: String(r[2] ?? ""),
              cantidad: r[3] !== undefined ? parseFloat(String(r[3])) || 0 : 0,
            });
          }
        }
        setData(out);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, unlocked]);

  const filtrado = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return data;
    return data.filter((d) => d.nombre.toLowerCase().includes(s) || d.especificacion.toLowerCase().includes(s));
  }, [data, q]);

  const filas = () => filtrado.map((d) => [d.nombre, d.especificacion, d.unidad, d.cantidad]);
  const enc = ["Material", "Especificación", "Unidad", "Stock"];

  const submitPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (sha256(pass) === CONFIG.STOCK_PASS_HASH) {
      setUnlocked(true);
      setPass("");
    } else {
      setPassError("Contraseña incorrecta.");
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  if (!unlocked) {
    return (
      <Modal open={open} onClose={onClose} maxWidth="max-w-md" title={<><Lock size={18} /> Acceso al stock</>}>
        <form onSubmit={submitPass} className="flex flex-col gap-3 p-3" autoComplete="off">
          <p className="text-sm text-slate-500">Ingrese la contraseña para ver el stock.</p>
          <div className="relative">
            <input
              autoFocus
              type={showPass ? "text" : "password"}
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setPassError("");
              }}
              placeholder="Contraseña"
              autoCapitalize="off"
              spellCheck={false}
              className={`input !pr-12 ${passError ? "invalid" : ""} ${shake ? "shake" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500"
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="min-h-[1.2em] text-sm text-red-500" role="alert">{passError}</div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Unlock size={16} /> Ingresar</button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stock en Tiempo Real"
      headerExtra={
        <button
          onClick={() => {
            setUnlocked(false);
            setData([]);
            onClose();
            onToast("🔒 Stock bloqueado.");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          <Lock size={14} /> Bloquear
        </button>
      }
      toolbar={
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Buscar material..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      }
      footer={
        <>
          <button className="btn btn-success" disabled={!filtrado.length} onClick={() => exportarExcel(enc, filas(), "Reporte_de_Stock")}>
            <FileSpreadsheet size={16} /> Exportar
          </button>
          <button className="btn btn-secondary" disabled={!filtrado.length} onClick={() => imprimirTabla("Reporte de Stock - ENERSA", enc, filas())}>
            <Printer size={16} /> Imprimir
          </button>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {enc.map((h) => (
                <th key={h} className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-500"><Loader2 className="mx-auto animate-spin" /> Cargando...</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="py-8 text-center text-red-500">Error: {error}</td></tr>
            ) : filtrado.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-500">No hay materiales.</td></tr>
            ) : (
              filtrado.map((d, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{d.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{d.especificacion}</td>
                  <td className="px-4 py-3">{d.unidad}</td>
                  <td className={`px-4 py-3 ${d.cantidad <= 0 ? "font-semibold text-red-500" : d.cantidad < 5 ? "font-semibold text-amber-500" : ""}`}>{d.cantidad}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
