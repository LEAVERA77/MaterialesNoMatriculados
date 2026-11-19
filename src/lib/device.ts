import { sha256 } from "./sha256";

/**
 * Huella del dispositivo.
 * - id: identificador persistente generado la primera vez que el teléfono abre la página
 *       (se guarda en localStorage + cookie). Identifica al MISMO teléfono en distintos días.
 * - huella: hash de características del equipo (pantalla, modelo, navegador, zona horaria,
 *       render de canvas, etc.). Se mantiene aunque se borre el id.
 * - descripcion: texto legible (ej: "Android 14 · Chrome 126 · SM-A546E").
 * - ip: IP pública desde donde se hizo la operación (si se puede obtener).
 */
export interface DeviceInfo {
  id: string;
  huella: string;
  descripcion: string;
  sistema: string;
  navegador: string;
  modelo: string;
  pantalla: string;
  zonaHoraria: string;
  idioma: string;
  userAgent: string;
  ip: string;
}

const KEY = "enersa_device_id";

function leerCookie(n: string) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

function generarId(): string {
  const arr = new Uint8Array(8);
  (window.crypto || (window as any).msCrypto).getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function obtenerIdPersistente(): string {
  let id = "";
  try { id = localStorage.getItem(KEY) || ""; } catch { /* ignore */ }
  if (!id) id = leerCookie(KEY);
  if (!id) id = generarId();
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  document.cookie = `${KEY}=${encodeURIComponent(id)}; max-age=${60 * 60 * 24 * 365 * 5}; path=/; SameSite=Lax`;
  return id;
}

function canvasHash(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 220; c.height = 40;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "16px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("ENERSA·Materiales ⚡ 123", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("ENERSA·Materiales ⚡ 123", 4, 17);
    return sha256(c.toDataURL()).slice(0, 16);
  } catch {
    return "";
  }
}

function webglInfo(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  } catch {
    return "";
  }
}

function parsearUA(ua: string) {
  let sistema = "Desconocido";
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Android\s([\d.]+)/))) sistema = `Android ${m[1]}`;
  else if ((m = ua.match(/(iPhone|iPad|iPod).*?OS\s([\d_]+)/))) sistema = `iOS ${m[2].replace(/_/g, ".")}`;
  else if (/Windows NT 10/.test(ua)) sistema = "Windows 10/11";
  else if (/Windows/.test(ua)) sistema = "Windows";
  else if ((m = ua.match(/Mac OS X ([\d_]+)/))) sistema = `macOS ${m[1].replace(/_/g, ".")}`;
  else if (/Linux/.test(ua)) sistema = "Linux";

  let navegador = "Navegador";
  if ((m = ua.match(/SamsungBrowser\/([\d]+)/))) navegador = `Samsung Internet ${m[1]}`;
  else if ((m = ua.match(/EdgA?\/([\d]+)/))) navegador = `Edge ${m[1]}`;
  else if ((m = ua.match(/OPR\/([\d]+)/))) navegador = `Opera ${m[1]}`;
  else if ((m = ua.match(/CriOS\/([\d]+)/))) navegador = `Chrome ${m[1]}`;
  else if ((m = ua.match(/FxiOS\/([\d]+)|Firefox\/([\d]+)/))) navegador = `Firefox ${m[1] || m[2]}`;
  else if ((m = ua.match(/Chrome\/([\d]+)/))) navegador = `Chrome ${m[1]}`;
  else if ((m = ua.match(/Version\/([\d.]+).*Safari/))) navegador = `Safari ${m[1]}`;

  let modelo = "";
  if ((m = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\sBuild|\))/))) {
    const cand = m[1].trim();
    if (cand && cand !== "K" && !/^wv$/i.test(cand)) modelo = cand;
  } else if ((m = ua.match(/(iPhone|iPad|iPod)/))) modelo = m[1];
  return { sistema, navegador, modelo };
}

async function obtenerIP(): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json();
    return j.ip || "";
  } catch {
    return "";
  }
}

let cache: Promise<DeviceInfo> | null = null;

export function obtenerDispositivo(): Promise<DeviceInfo> {
  if (cache) return cache;
  cache = (async () => {
    const ua = navigator.userAgent;
    let { sistema, navegador, modelo } = parsearUA(ua);

    // Client Hints (Chrome/Android): modelo real y versión del sistema
    const uaData = (navigator as any).userAgentData;
    if (uaData?.getHighEntropyValues) {
      try {
        const hi = await uaData.getHighEntropyValues(["model", "platformVersion", "platform"]);
        if (hi.model) modelo = hi.model;
        if (hi.platform === "Android" && hi.platformVersion) sistema = `Android ${hi.platformVersion.split(".")[0]}`;
      } catch { /* ignore */ }
    }

    const pantalla = `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}`;
    const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const idioma = navigator.language || "";

    const componentes = [
      ua, navigator.platform, idioma, zonaHoraria, pantalla, screen.colorDepth,
      navigator.hardwareConcurrency, (navigator as any).deviceMemory, navigator.maxTouchPoints,
      modelo, canvasHash(), webglInfo(),
    ].join("||");

    const ip = await obtenerIP();

    return {
      id: obtenerIdPersistente(),
      huella: sha256(componentes).slice(0, 12).toUpperCase(),
      descripcion: [sistema, navegador, modelo].filter(Boolean).join(" · "),
      sistema,
      navegador,
      modelo,
      pantalla,
      zonaHoraria,
      idioma,
      userAgent: ua,
      ip,
    };
  })();
  return cache;
}

/** Etiqueta compacta que se agrega al campo "uso" para que quede registrada en la planilla. */
export function etiquetaRastro(legajo: string, d: DeviceInfo): string {
  const partes = [`Leg. ${legajo}`, `Disp. ${d.id}`, `Huella ${d.huella}`, d.descripcion];
  if (d.ip) partes.push(`IP ${d.ip}`);
  return `[${partes.join(" | ")}]`;
}

export const REGEX_RASTRO = /\s*\[Leg\.[^\]]*\]\s*$/;
