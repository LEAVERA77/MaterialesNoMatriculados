import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Box, Fingerprint, History, ListPlus, Loader2, Lock, LogOut, Plus, Search, Smartphone, UserCircle2, X } from "lucide-react";
import LoginScreen from "./components/LoginScreen";
import ItemRow, { type ItemState } from "./components/ItemRow";
import StockModal from "./components/StockModal";
import HistoryModal, { type HistItem } from "./components/HistoryModal";
import ReceiptModal, { type ReceiptData } from "./components/ReceiptModal";
import { ToastProvider, useToast } from "./components/Toast";
import { buscarPorLegajo, nombreCompleto, type Usuario } from "./data/usuarios";
import { obtenerDispositivo, type DeviceInfo } from "./lib/device";
import { CONFIG, enviarMovimiento, horaActual, hoyISO, type Operacion } from "./lib/api";

const SESSION_KEY = "enersa_sesion";
const INACTIVIDAD_MIN = 20;

let keySeq = 1;
const nuevoItem = (): ItemState => ({ key: keySeq++, query: "", material: "", unidad: "", cantidad: "" });

function leerSesion(): Usuario | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { legajo: string; t: number };
    if (Date.now() - s.t > INACTIVIDAD_MIN * 60000) return null;
    return buscarPorLegajo(s.legajo) ?? null;
  } catch {
    return null;
  }
}

function Principal() {
  const toast = useToast();
  const [usuario, setUsuario] = useState<Usuario | null>(leerSesion);
  const [device, setDevice] = useState<DeviceInfo | null>(null);

  const [fecha, setFecha] = useState(hoyISO());
  const [uso, setUso] = useState("");
  const [items, setItems] = useState<ItemState[]>([nuevoItem()]);
  const [invalid, setInvalid] = useState(false);
  const [procesando, setProcesando] = useState<Operacion | null>(null);

  const [stockOpen, setStockOpen] = useState(false);
  const [stockUnlocked, setStockUnlocked] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showDevice, setShowDevice] = useState(false);

  useEffect(() => {
    obtenerDispositivo().then(setDevice);
  }, []);

  // Mantener sesión viva con actividad y cerrar por inactividad
  const ultimaActividad = useRef(Date.now());
  useEffect(() => {
    if (!usuario) return;
    const tocar = () => {
      ultimaActividad.current = Date.now();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ legajo: usuario.legajo, t: Date.now() }));
    };
    tocar();
    const evs = ["click", "keydown", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, tocar, { passive: true }));
    const iv = setInterval(() => {
      if (Date.now() - ultimaActividad.current > INACTIVIDAD_MIN * 60000) {
        cerrarSesion();
        toast("Sesión cerrada por inactividad.", true);
      }
    }, 30000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, tocar));
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const limpiarFormulario = () => {
    setUso("");
    setItems([nuevoItem()]);
    setInvalid(false);
    setFecha(hoyISO());
  };

  const cerrarSesion = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUsuario(null);
    setStockUnlocked(false);
    setStockOpen(false);
    setHistOpen(false);
    setReceipt(null);
    limpiarFormulario();
  }, []);

  const login = (u: Usuario) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ legajo: u.legajo, t: Date.now() }));
    setUsuario(u);
    toast(`👋 Bienvenido/a, ${u.nombre.split(" ")[0]}`);
  };

  if (!usuario) return <LoginScreen device={device} onLogin={login} />;

  const nombre = nombreCompleto(usuario);

  const asegurarDispositivo = async () => device ?? (await obtenerDispositivo());

  const procesar = async (op: Operacion) => {
    if (!fecha) return toast("La fecha es obligatoria.", true);
    if (!uso.trim()) return toast("Describa el uso.", true);
    const okItems = items.every((i) => i.material && parseFloat(i.cantidad) > 0);
    if (!okItems) {
      setInvalid(true);
      setTimeout(() => setInvalid(false), 2500);
      return toast("Complete todos los materiales (seleccione de la lista y cargue cantidad).", true);
    }
    setProcesando(op);
    try {
      const dev = await asegurarDispositivo();
      const lista = items.map((i) => ({ material: i.material, cantidad: parseFloat(i.cantidad), unidad: i.unidad }));
      await enviarMovimiento({
        fecha: `${fecha} ${horaActual()}`,
        usuario: nombre,
        legajo: usuario.legajo,
        operacion: op,
        uso: uso.trim(),
        items: lista,
        dispositivo: dev,
      });
      toast(`✅ ${op === "retiro" ? "RETIRO" : "DEVOLUCIÓN"} procesado.`);
      setReceipt({
        fechaHora: new Date().toLocaleString("es-AR"),
        usuario: nombre,
        legajo: usuario.legajo,
        operacion: op,
        uso: uso.trim(),
        items: lista,
        device: dev,
      });
      setUso("");
      setItems([nuevoItem()]);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setProcesando(null);
    }
  };

  const devolucionRapida = async (it: HistItem): Promise<boolean> => {
    if (!confirm(`¿Confirma devolver ${it.cantidad} de "${it.material}" al stock?\nQuedará registrada a nombre de ${nombre}.`)) return false;
    try {
      toast("Procesando devolución rápida...");
      const dev = await asegurarDispositivo();
      const usoTxt = `Devolución rápida de: ${it.uso}${it.usuario.toUpperCase() !== nombre.toUpperCase() ? ` (retiro de ${it.usuario})` : ""}`;
      await enviarMovimiento({
        fecha: `${hoyISO()} ${horaActual()}`,
        usuario: nombre,
        legajo: usuario.legajo,
        operacion: "devolucion",
        uso: usoTxt,
        items: [{ material: it.material, cantidad: it.cantidad, unidad: "" }],
        dispositivo: dev,
      });
      toast("✅ Devolución registrada.");
      return true;
    } catch (e) {
      toast((e as Error).message, true);
      return false;
    }
  };

  return (
    <div className="min-h-screen px-2 py-3 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-10">
        {/* Encabezado */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
          <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            <Box className="text-blue-500" size={24} /> Gestión de Materiales
          </h1>
          <span className="text-sm font-medium text-slate-500">ENERSA · María Grande</span>
        </div>

        {/* Usuario identificado */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
              <UserCircle2 size={24} />
            </div>
            <div>
              <div className="font-semibold text-slate-900">{nombre}</div>
              <div className="text-xs font-medium text-slate-500">Legajo Nº {usuario.legajo}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowDevice((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Fingerprint size={14} /> {device ? `Disp. ${device.id.slice(0, 8)}` : "Identificando..."}
            </button>
            <button onClick={cerrarSesion} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
              <LogOut size={14} /> Cambiar usuario
            </button>
          </div>
          {showDevice && device && (
            <div className="fade-up w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-600 sm:basis-full">
              <div className="mb-1 flex items-center gap-1.5 font-sans text-xs font-semibold text-slate-700">
                <Smartphone size={13} /> Este dispositivo queda registrado en cada movimiento
              </div>
              <div>Equipo: {device.descripcion}</div>
              <div>ID: {device.id} · Huella: {device.huella}</div>
              <div>Pantalla: {device.pantalla} · Zona: {device.zonaHoraria}</div>
              {device.ip && <div>IP: {device.ip}</div>}
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-500">Fecha <span className="text-red-500">*</span></label>
            <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-500">Usuario</label>
            <input className="input" readOnly value={`${nombre} (Leg. ${usuario.legajo})`} />
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-500">Uso / destino <span className="text-red-500">*</span></label>
          <textarea className="input" rows={2} placeholder="Describa el uso o destino del material..." value={uso} onChange={(e) => setUso(e.target.value)} />
        </div>

        <div className="my-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <ListPlus size={18} /> Materiales a mover
            <span className="ml-auto text-xs font-normal text-slate-400">{items.length}/{CONFIG.MAX_ITEMS}</span>
          </h2>
          <div className="flex flex-col gap-4">
            {items.map((it, idx) => (
              <ItemRow
                key={it.key}
                item={it}
                index={idx}
                invalid={invalid}
                canRemove={items.length > 1}
                onChange={(patch) => setItems((arr) => arr.map((x) => (x.key === it.key ? { ...x, ...patch } : x)))}
                onRemove={() => setItems((arr) => arr.filter((x) => x.key !== it.key))}
              />
            ))}
          </div>
          <button
            className="btn btn-secondary mt-4 w-full sm:w-auto"
            onClick={() => {
              if (items.length >= CONFIG.MAX_ITEMS) return toast(`Máximo ${CONFIG.MAX_ITEMS} materiales.`, true);
              setItems((a) => [...a, nuevoItem()]);
            }}
          >
            <Plus size={16} /> Añadir otro material
          </button>
        </div>

        <div className="mt-6 flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className={`text-sm font-medium ${procesando === "retiro" ? "text-blue-500" : procesando ? "text-amber-500" : "text-slate-400"}`}>
            {procesando ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> {procesando === "retiro" ? "Procesando Retiro..." : "Procesando Devolución..."}
              </span>
            ) : (
              "Esperando acción"
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button className="btn btn-info" onClick={() => setStockOpen(true)} title={stockUnlocked ? "Ver stock" : "Requiere contraseña"}>
              {stockUnlocked ? <Search size={16} /> : <Lock size={16} />} Ver Stock
            </button>
            <button className="btn btn-secondary" onClick={() => setHistOpen(true)}>
              <History size={16} /> Historial
            </button>
            <button className="btn btn-primary" disabled={!!procesando} onClick={() => procesar("retiro")}>
              <ArrowDown size={16} /> Retirar
            </button>
            <button className="btn btn-warning" disabled={!!procesando} onClick={() => procesar("devolucion")}>
              <ArrowUp size={16} /> Devolver
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => confirm("¿Seguro que desea limpiar el formulario?") && limpiarFormulario()}
            >
              <X size={16} /> Limpiar
            </button>
          </div>
        </div>
      </div>

      <StockModal open={stockOpen} onClose={() => setStockOpen(false)} unlocked={stockUnlocked} setUnlocked={setStockUnlocked} onToast={toast} />
      <HistoryModal open={histOpen} onClose={() => setHistOpen(false)} usuarioActual={nombre} onDevolucionRapida={devolucionRapida} />
      <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Principal />
    </ToastProvider>
  );
}
