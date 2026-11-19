"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  CloudUpload,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Unlock,
  X,
} from "lucide-react";
import Modal from "./Modal";
import {
  accesoStock,
  descargarExcelCompleto,
  exportarExcel,
  imprimirTabla,
  sincronizarGithubAhora,
  type MaterialDB,
} from "../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  unlocked: boolean;
  setUnlocked: (v: boolean) => void;
  onToast: (m: string, e?: boolean) => void;
  onStockChange?: (lista: MaterialDB[]) => void;
}

// La contraseña solo vive en memoria mientras el stock está desbloqueado
let passSesion = "";

export default function StockModal({ open, onClose, unlocked, setUnlocked, onToast, onStockChange }: Props) {
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [shake, setShake] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [data, setData] = useState<MaterialDB[]>([]);
  const [githubSync, setGithubSync] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", especificacion: "", unidad: "piezas", stock: "" });

  const aplicar = useCallback(
    (r: { stock: MaterialDB[]; githubSync: boolean }) => {
      setData(r.stock);
      setGithubSync(r.githubSync);
      onStockChange?.(r.stock);
    },
    [onStockChange],
  );

  const cargar = useCallback(() => {
    if (!passSesion) return;
    setLoading(true);
    setError("");
    accesoStock(passSesion)
      .then(aplicar)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [aplicar]);

  useEffect(() => {
    if (!open) {
      setPass("");
      setPassError("");
      setShowPass(false);
      setEditId(null);
      setNuevoOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !unlocked) return;
    setQ("");
    cargar();
  }, [open, unlocked, cargar]);

  useEffect(() => {
    if (!unlocked) passSesion = "";
  }, [unlocked]);

  const filtrado = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return data;
    return data.filter((d) => d.nombre.toLowerCase().includes(s) || d.especificacion.toLowerCase().includes(s));
  }, [data, q]);

  const filas = () => filtrado.map((d) => [d.nombre, d.especificacion, d.unidad, d.stock]);
  const enc = ["Material", "Especificación", "Unidad", "Stock"];

  const submitPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificando(true);
    try {
      const r = await accesoStock(pass);
      passSesion = pass;
      aplicar(r);
      setUnlocked(true);
      setPass("");
    } catch (err) {
      setPassError((err as Error).message);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setVerificando(false);
    }
  };

  const guardarAjuste = async (m: MaterialDB) => {
    const val = parseFloat(editVal.replace(",", "."));
    if (!Number.isFinite(val) || val < 0) return onToast("Ingrese un stock válido.", true);
    const motivo = prompt(`Motivo del ajuste de "${m.nombre}" (${m.stock} → ${val}):`, "Ingreso de compra / inventario");
    if (motivo === null) return;
    setGuardando(true);
    try {
      aplicar(await accesoStock(passSesion, { accion: "ajustar", id: m.id, stock: val, motivo }));
      setEditId(null);
      onToast("✅ Stock actualizado.");
    } catch (e) {
      onToast((e as Error).message, true);
    } finally {
      setGuardando(false);
    }
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return onToast("Ingrese el nombre del material.", true);
    setGuardando(true);
    try {
      aplicar(
        await accesoStock(passSesion, {
          accion: "crear",
          nombre: nuevo.nombre,
          especificacion: nuevo.especificacion,
          unidad: nuevo.unidad,
          stock: parseFloat(nuevo.stock.replace(",", ".")) || 0,
        }),
      );
      setNuevo({ nombre: "", especificacion: "", unidad: "piezas", stock: "" });
      setNuevoOpen(false);
      onToast("✅ Material agregado.");
    } catch (err) {
      onToast((err as Error).message, true);
    } finally {
      setGuardando(false);
    }
  };

  if (!unlocked) {
    return (
      <Modal open={open} onClose={onClose} maxWidth="max-w-md" title={<><Lock size={18} /> Acceso al stock</>}>
        <form onSubmit={submitPass} className="flex flex-col gap-3 p-3" autoComplete="off">
          <p className="text-sm text-slate-500">Ingrese la contraseña para ver y administrar el stock.</p>
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
            <button type="submit" className="btn btn-primary" disabled={verificando || !pass}>
              {verificando ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />} Ingresar
            </button>
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
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            title="Actualizar"
            className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
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
        </div>
      }
      toolbar={
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input !pl-9" placeholder="Buscar material..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn btn-info whitespace-nowrap" onClick={() => setNuevoOpen((v) => !v)}>
              <Plus size={16} /> <span className="hidden sm:inline">Nuevo material</span>
            </button>
          </div>
          {nuevoOpen && (
            <form onSubmit={crear} className="fade-up grid grid-cols-1 gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:grid-cols-[2fr_2fr_1fr_1fr_auto]">
              <input className="input" placeholder="Nombre *" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              <input className="input" placeholder="Especificación" value={nuevo.especificacion} onChange={(e) => setNuevo({ ...nuevo, especificacion: e.target.value })} />
              <input className="input" placeholder="Unidad" value={nuevo.unidad} onChange={(e) => setNuevo({ ...nuevo, unidad: e.target.value })} />
              <input className="input" placeholder="Stock inicial" inputMode="decimal" value={nuevo.stock} onChange={(e) => setNuevo({ ...nuevo, stock: e.target.value })} />
              <button className="btn btn-primary" disabled={guardando}>
                {guardando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Agregar
              </button>
            </form>
          )}
        </div>
      }
      footer={
        <>
          {githubSync && (
            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  onToast("Sincronizando con GitHub...");
                  onToast(await sincronizarGithubAhora(passSesion));
                } catch (e) {
                  onToast((e as Error).message, true);
                }
              }}
            >
              <CloudUpload size={16} /> Subir a GitHub
            </button>
          )}
          <button
            className="btn btn-info"
            onClick={() => descargarExcelCompleto(passSesion).catch((e: Error) => onToast(e.message, true))}
          >
            <Download size={16} /> Excel completo
          </button>
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
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {[...enc, ""].map((h, i) => (
                <th key={i} className="sticky top-0 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !data.length ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500"><Loader2 className="mx-auto animate-spin" /> Cargando...</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="py-8 text-center text-red-500">Error: {error}</td></tr>
            ) : filtrado.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay materiales.</td></tr>
            ) : (
              filtrado.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{d.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{d.especificacion}</td>
                  <td className="px-4 py-3">{d.unidad}</td>
                  <td className={`px-4 py-3 ${d.stock <= 0 ? "font-semibold text-red-500" : d.stock < 5 ? "font-semibold text-amber-500" : ""}`}>
                    {editId === d.id ? (
                      <input
                        autoFocus
                        className="input !w-24 !px-2 !py-1.5"
                        inputMode="decimal"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") guardarAjuste(d);
                          if (e.key === "Escape") setEditId(null);
                        }}
                      />
                    ) : (
                      d.stock
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {editId === d.id ? (
                      <div className="flex justify-end gap-1">
                        <button disabled={guardando} onClick={() => guardarAjuste(d)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Guardar">
                          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button onClick={() => setEditId(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Cancelar">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditId(d.id);
                          setEditVal(String(d.stock));
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Ajustar stock"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
