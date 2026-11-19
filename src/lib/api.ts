import * as XLSX from "xlsx";
import type { DeviceInfo } from "./device";
import { etiquetaRastro } from "./device";

export const CONFIG = {
  ghUser: "LEAVERA77",
  ghRepo: "MaterialesNoMatriculados",
  ghPath: "listado_materiales_ENERSA.xlsx",
  urlGoogle:
    "https://script.google.com/macros/s/AKfycbwVtmNDuo80dvj1PNVld-FK5oTRsmvP7NWIXpSpq6r9j3sbfKEGpjERCM-LiD_Cgph7/exec",
  // Hash SHA-256 de la contraseña de stock
  STOCK_PASS_HASH: "f8149d718d97cd29ab06903dcd48285278c41a6d16db9d4bec20f25d446c50a0",
  // Agrega la huella del dispositivo al final del campo "uso" (queda registrada sin tocar el Apps Script)
  RASTRO_EN_USO: true,
  MAX_ITEMS: 10,
};

export type Operacion = "retiro" | "devolucion";

export interface ItemMov {
  material: string;
  cantidad: number;
  unidad: string;
}

export interface PayloadMovimiento {
  fecha: string;
  usuario: string;
  legajo: string;
  operacion: Operacion;
  uso: string;
  items: ItemMov[];
  dispositivo: DeviceInfo;
}

export async function descargarExcel(): Promise<XLSX.WorkBook> {
  const url = `https://raw.githubusercontent.com/${CONFIG.ghUser}/${CONFIG.ghRepo}/main/${CONFIG.ghPath}?t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo leer el archivo. Asegúrese de que el repositorio sea público.");
  const buf = await res.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

export async function enviarMovimiento(p: PayloadMovimiento): Promise<void> {
  const usoFinal = CONFIG.RASTRO_EN_USO ? `${p.uso} ${etiquetaRastro(p.legajo, p.dispositivo)}` : p.uso;
  const body = {
    ...p,
    uso: usoFinal,
    // Campos planos extra, por si el Apps Script quiere guardarlos en columnas propias
    dispositivoId: p.dispositivo.id,
    dispositivoHuella: p.dispositivo.huella,
    dispositivoDesc: p.dispositivo.descripcion,
    dispositivoIP: p.dispositivo.ip,
    userAgent: p.dispositivo.userAgent,
  };
  const res = await fetch(CONFIG.urlGoogle, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Error al conectar con Google.");
}

export function hoyISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function horaActual(): string {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function formatearFechaCelda(v: unknown): string {
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    if (p) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(p.d)}/${pad(p.m)}/${p.y} ${pad(p.H)}:${pad(p.M)}`;
    }
  }
  return String(v ?? "");
}

export function exportarExcel(encabezados: string[], filas: (string | number)[][], nombre: string) {
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${nombre}_${hoyISO()}.xlsx`);
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function imprimirTabla(titulo: string, encabezados: string[], filas: (string | number)[][]) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title>
  <style>body{font-family:Arial,sans-serif;padding:16px}h2{text-align:center}table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #000;padding:6px;font-size:12px;text-align:left}th{background:#eee}
  @page{size:A4;margin:1.5cm}</style></head><body><h2>${esc(titulo)}</h2>
  <table><thead><tr>${encabezados.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <script>window.onload=function(){window.print();}</script></body></html>`;
  imprimirHTML(html);
}

export function imprimirHTML(html: string) {
  const w = window.open("", "_blank");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    return;
  }
  // Fallback: iframe oculto
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html.replace("<script>window.onload=function(){window.print();}</script>", ""));
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 300);
}

export { esc };
