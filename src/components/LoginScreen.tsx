import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Box, Fingerprint, IdCard, Loader2, LogIn, Smartphone, UserX } from "lucide-react";
import { buscarPorLegajo, nombreCompleto, type Usuario } from "../data/usuarios";
import type { DeviceInfo } from "../lib/device";

interface Props {
  device: DeviceInfo | null;
  onLogin: (u: Usuario) => void;
}

const MAX_INTENTOS = 5;
const BLOQUEO_SEG = 30;

export default function LoginScreen({ device, onLogin }: Props) {
  const [legajo, setLegajo] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [candidato, setCandidato] = useState<Usuario | null>(null);
  const [intentos, setIntentos] = useState(0);
  const [bloqueo, setBloqueo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [candidato]);

  useEffect(() => {
    if (bloqueo <= 0) return;
    const t = setTimeout(() => setBloqueo((b) => b - 1), 1000);
    return () => clearTimeout(t);
  }, [bloqueo]);

  const validar = (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueo > 0) return;
    if (!legajo.trim()) {
      setError("Ingrese su número de legajo.");
      return;
    }
    const u = buscarPorLegajo(legajo);
    if (!u) {
      const n = intentos + 1;
      setIntentos(n);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (n >= MAX_INTENTOS) {
        setBloqueo(BLOQUEO_SEG);
        setIntentos(0);
        setError(`Demasiados intentos. Espere ${BLOQUEO_SEG} segundos.`);
      } else {
        setError(`Legajo no habilitado. Intentos restantes: ${MAX_INTENTOS - n}`);
      }
      return;
    }
    setError("");
    setCandidato(u);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 p-4">
      <div className="fade-up w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <Box size={30} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Gestión de Materiales</h1>
          <p className="text-sm font-medium text-slate-500">ENERSA · María Grande</p>
        </div>

        {!candidato ? (
          <form onSubmit={validar} className="flex flex-col gap-4" autoComplete="off">
            <label htmlFor="legajo" className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <IdCard size={16} /> Ingrese su número de legajo
            </label>
            <input
              ref={inputRef}
              id="legajo"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={legajo}
              disabled={bloqueo > 0}
              onChange={(e) => {
                setLegajo(e.target.value.replace(/\D/g, ""));
                if (!bloqueo) setError("");
              }}
              placeholder="Ej: 12345"
              className={`input text-center !text-2xl font-semibold tracking-[0.3em] ${error ? "invalid" : ""} ${shake ? "shake" : ""}`}
            />
            <div className="min-h-[1.25rem] text-center text-sm text-red-500" role="alert">
              {bloqueo > 0 ? `Bloqueado temporalmente: ${bloqueo}s` : error}
            </div>
            <button type="submit" className="btn btn-primary w-full !py-3.5 text-base" disabled={bloqueo > 0}>
              <LogIn size={18} /> Validar legajo
            </button>
          </form>
        ) : (
          <div className="fade-up flex flex-col gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <BadgeCheck className="mx-auto mb-2 text-emerald-600" size={36} />
              <p className="text-sm text-emerald-700">Legajo validado</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{nombreCompleto(candidato)}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Legajo Nº {candidato.legajo}</p>
            </div>
            <button className="btn btn-primary w-full !py-3.5 text-base" onClick={() => onLogin(candidato)}>
              Sí, soy yo · Continuar
            </button>
            <button
              className="btn btn-secondary w-full"
              onClick={() => {
                setCandidato(null);
                setLegajo("");
              }}
            >
              <UserX size={16} /> No soy yo
            </button>
          </div>
        )}

        <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-600">
            <Fingerprint size={15} /> Registro de dispositivo
          </div>
          <p className="mb-2">Por seguridad, cada retiro o devolución queda asociado a su legajo y a este dispositivo.</p>
          {device ? (
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
              <Smartphone size={14} className="shrink-0" />
              <span className="truncate">
                {device.descripcion} · ID {device.id}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Identificando dispositivo...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
