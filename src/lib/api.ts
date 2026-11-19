import * as XLSX from "xlsx";
import type { DeviceInfo } from "./device";
import { etiquetaRastro } from "./device";

export const CONFIG = {
  MAX_ITEMS: 10,
};

export type Operacion = "retiro" | "devolucion";

export interface ItemMov {
  materialId?: number;
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

export interface MaterialDB {
  id: number;
  nombre: string;
  especificacion: string;
  unidad: string;
  stock: number;
}

export interface HistRow {
  id: number;
  movimientoId: number;
  fecha: string;
  usuario: string;
  legajo: string | null;
  operacion: string;
  uso: string;
  rastro: string;
  materialId: number | null;
  material: string;
  cantidad: number;
  unidad: string;
  stockResultante: number | null;
}

async function leerJSON<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status}).`);
  return data;
}

export async function obtenerMateriales(): Promise<MaterialDB[]> {
  const r = await leerJSON<{ materiales: MaterialDB[] }>(await fetch("/api/materiales", { cache: "no-store" }));
  return r.materiales;
}

export async function obtenerHistorial(): Promise<HistRow[]> {
  const r = await leerJSON<{ historial: HistRow[] }>(await fetch("/api/movimientos", { cache: "no-store" }));
  return r.historial;
}

export async function accesoStock(
  password: string,
  extra: Record<string, unknown> = {},
): Promise<{ stock: MaterialDB[]; githubSync: boolean }> {
  return leerJSON(
    await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...extra }),
    }),
  );
}

export async function descargarExcelCompleto(password: string) {
  const res = await fetch("/api/exportar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) await leerJSON(res);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `listado_materiales_ENERSA_${hoyISO()}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function sincronizarGithubAhora(password: string): Promise<string> {
  const r = await leerJSON<{ detalle: string }>(
    await fetch("/api/exportar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, github: true }),
    }),
  );
  return r.detalle;
}

export interface ResultadoMovimiento {
  id: number;
  usuario: string;
  operacion: string;
  items: { material: string; cantidad: number; unidad: string; stock: number }[];
}

/** Registra el movimiento en la base de datos: el stock se actualiza automáticamente en el servidor. */
export async function enviarMovimiento(p: PayloadMovimiento): Promise<ResultadoMovimiento> {
  const r = await leerJSON<{ movimiento: ResultadoMovimiento }>(
    await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: p.fecha,
        legajo: p.legajo,
        operacion: p.operacion,
        uso: p.uso,
        items: p.items.map((i) => ({ materialId: i.materialId, material: i.material, cantidad: i.cantidad })),
        rastro: etiquetaRastro(p.legajo, p.dispositivo).replace(/^\[|\]$/g, ""),
        dispositivo: p.dispositivo,
      }),
    }),
  );
  return r.movimiento;
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
