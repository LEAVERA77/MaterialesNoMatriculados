import * as XLSX from "xlsx";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { materiales, movimientoItems, movimientos, usuarios } from "@/db/schema";
import { sha256 } from "@/lib/sha256";
import { ensureReady } from "./init";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const DEFAULT_STOCK_PASS_HASH = "f8149d718d97cd29ab06903dcd48285278c41a6d16db9d4bec20f25d446c50a0";

export function verificarPassword(pass: unknown) {
  const hash = process.env.STOCK_PASS_HASH || DEFAULT_STOCK_PASS_HASH;
  if (typeof pass !== "string" || sha256(pass) !== hash) throw new HttpError(401, "Contraseña incorrecta.");
}

export const nombreHistorial = (apellido: string, nombre: string) =>
  `${apellido}, ${nombre.split(" ")[0] ?? ""}`.toUpperCase();

export async function listarMateriales() {
  await ensureReady();
  return db
    .select({
      id: materiales.id,
      nombre: materiales.nombre,
      especificacion: materiales.especificacion,
      unidad: materiales.unidad,
      stock: materiales.stock,
    })
    .from(materiales)
    .orderBy(asc(materiales.nombre), asc(materiales.especificacion));
}

export async function listarHistorial() {
  await ensureReady();
  const rows = await db
    .select({
      id: movimientoItems.id,
      movimientoId: movimientos.id,
      fecha: movimientos.fecha,
      usuario: movimientos.usuario,
      legajo: movimientos.legajo,
      operacion: movimientos.operacion,
      uso: movimientos.uso,
      rastro: movimientos.rastro,
      materialId: movimientoItems.materialId,
      material: movimientoItems.material,
      cantidad: movimientoItems.cantidad,
      unidad: movimientoItems.unidad,
      stockResultante: movimientoItems.stockResultante,
    })
    .from(movimientoItems)
    .innerJoin(movimientos, eq(movimientos.id, movimientoItems.movimientoId))
    .orderBy(desc(movimientos.id), desc(movimientoItems.id));
  return rows;
}

export interface ItemEntrada {
  materialId?: number;
  material: string;
  cantidad: number;
}

export interface MovimientoEntrada {
  fecha: string;
  legajo: string;
  operacion: "retiro" | "devolucion";
  uso: string;
  items: ItemEntrada[];
  rastro?: string;
  dispositivo?: unknown;
}

/**
 * Registra un retiro o devolución y actualiza el stock AUTOMÁTICAMENTE dentro de una
 * transacción con bloqueo de filas: si dos personas retiran a la vez, nunca queda stock negativo.
 */
export async function registrarMovimiento(e: MovimientoEntrada) {
  await ensureReady();
  if (e.operacion !== "retiro" && e.operacion !== "devolucion") throw new HttpError(400, "Operación inválida.");
  if (!e.uso?.trim()) throw new HttpError(400, "Describa el uso.");
  if (!Array.isArray(e.items) || e.items.length === 0) throw new HttpError(400, "No hay materiales.");
  if (e.items.length > 20) throw new HttpError(400, "Demasiados materiales en un solo movimiento.");

  const legajo = String(e.legajo ?? "").replace(/\D/g, "").replace(/^0+/, "");
  const [u] = await db.select().from(usuarios).where(eq(usuarios.legajo, legajo));
  if (!u || !u.activo) throw new HttpError(403, "Legajo no habilitado.");

  // Agrupar ítems repetidos del mismo material
  const agrupados = new Map<string, ItemEntrada>();
  for (const it of e.items) {
    const cant = Number(it.cantidad);
    if (!it.material || !(cant > 0)) throw new HttpError(400, "Cantidad inválida.");
    const mid = Number.isInteger(it.materialId) ? (it.materialId as number) : undefined;
    const k = mid ? `#${mid}` : it.material.trim().toLowerCase();
    const prev = agrupados.get(k);
    agrupados.set(k, { materialId: mid, material: it.material.trim(), cantidad: (prev?.cantidad ?? 0) + cant });
  }

  const op = e.operacion === "retiro" ? "RETIRO" : "DEVOLUCION";
  const usuarioTxt = nombreHistorial(u.apellido, u.nombre);

  return db.transaction(async (tx) => {
    const resultado: { material: string; cantidad: number; unidad: string; stock: number }[] = [];
    const filas: { id: number; nombre: string; unidad: string; nuevo: number; cantidad: number }[] = [];

    for (const it of agrupados.values()) {
      const r = await tx.execute<{ id: number; nombre: string; especificacion: string; unidad: string; stock: number }>(
        it.materialId
          ? sql`select id, nombre, especificacion, unidad, stock from materiales where id = ${it.materialId} for update`
          : sql`select id, nombre, especificacion, unidad, stock from materiales where lower(trim(nombre)) = ${it.material.toLowerCase()} order by id limit 1 for update`,
      );
      const row = r.rows[0];
      if (!row) throw new HttpError(404, `Material no encontrado: ${it.material}`);
      const m = { ...row, nombre: await etiquetaMaterial(tx, row) };
      const actual = Number(m.stock);
      if (op === "RETIRO" && it.cantidad > actual + 1e-9) {
        throw new HttpError(409, `Stock insuficiente para "${m.nombre}". Solicitado: ${it.cantidad}, disponible: ${actual}.`);
      }
      const nuevo = Math.round((op === "RETIRO" ? actual - it.cantidad : actual + it.cantidad) * 1000) / 1000;
      filas.push({ id: m.id, nombre: m.nombre, unidad: m.unidad, nuevo, cantidad: it.cantidad });
    }

    const [mov] = await tx
      .insert(movimientos)
      .values({
        fecha: e.fecha,
        usuario: usuarioTxt,
        legajo: u.legajo,
        operacion: op,
        uso: e.uso.trim(),
        rastro: e.rastro ?? "",
        dispositivo: e.dispositivo ?? null,
        origen: "app",
      })
      .returning({ id: movimientos.id });

    for (const f of filas) {
      await tx.update(materiales).set({ stock: f.nuevo, actualizadoEn: new Date() }).where(eq(materiales.id, f.id));
      await tx.insert(movimientoItems).values({
        movimientoId: mov.id,
        materialId: f.id,
        material: f.nombre,
        cantidad: f.cantidad,
        unidad: f.unidad,
        stockResultante: f.nuevo,
      });
      resultado.push({ material: f.nombre, cantidad: f.cantidad, unidad: f.unidad, stock: f.nuevo });
    }
    return { id: mov.id, usuario: usuarioTxt, operacion: op, items: resultado };
  });
}

/** Ajuste manual de stock (inventario / ingreso de compra). Queda registrado en el historial. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Nombre a mostrar: si hay otro material con el mismo nombre, agrega la especificación. */
async function etiquetaMaterial(tx: Tx, m: { id: number; nombre: string; especificacion: string }) {
  if (!m.especificacion) return m.nombre;
  const r = await tx.execute<{ n: number }>(
    sql`select count(*)::int as n from materiales where lower(trim(nombre)) = ${m.nombre.trim().toLowerCase()}`,
  );
  return r.rows[0].n > 1 ? `${m.nombre} · ${m.especificacion}` : m.nombre;
}

export async function ajustarStock(id: number, stock: number, motivo: string) {
  await ensureReady();
  if (!Number.isFinite(stock) || stock < 0) throw new HttpError(400, "Stock inválido.");
  return db.transaction(async (tx) => {
    const r = await tx.execute<{ id: number; nombre: string; especificacion: string; unidad: string; stock: number }>(
      sql`select id, nombre, especificacion, unidad, stock from materiales where id = ${id} for update`,
    );
    const row = r.rows[0];
    if (!row) throw new HttpError(404, "Material no encontrado.");
    const m = { ...row, nombre: await etiquetaMaterial(tx, row) };
    const diff = Math.round((stock - Number(m.stock)) * 1000) / 1000;
    if (diff === 0) return { stock };
    await tx.update(materiales).set({ stock, actualizadoEn: new Date() }).where(eq(materiales.id, id));
    const [mov] = await tx
      .insert(movimientos)
      .values({
        fecha: fechaAhora(),
        usuario: "ADMINISTRADOR",
        operacion: "AJUSTE",
        uso: motivo?.trim() || `Ajuste de inventario (${diff > 0 ? "+" : ""}${diff})`,
        origen: "ajuste",
      })
      .returning({ id: movimientos.id });
    await tx.insert(movimientoItems).values({
      movimientoId: mov.id,
      materialId: id,
      material: m.nombre,
      cantidad: diff,
      unidad: m.unidad,
      stockResultante: stock,
    });
    return { stock };
  });
}

export async function crearMaterial(d: { nombre: string; especificacion?: string; unidad?: string; stock?: number }) {
  await ensureReady();
  const nombre = d.nombre?.trim();
  if (!nombre) throw new HttpError(400, "El nombre es obligatorio.");
  const espec = d.especificacion?.trim() ?? "";
  const existe = await db.execute(
    sql`select 1 from materiales where lower(trim(nombre)) = ${nombre.toLowerCase()} and lower(trim(especificacion)) = ${espec.toLowerCase()}`,
  );
  if (existe.rows.length) throw new HttpError(409, "Ya existe un material con ese nombre y especificación.");
  const [m] = await db
    .insert(materiales)
    .values({ nombre, especificacion: d.especificacion?.trim() ?? "", unidad: d.unidad?.trim() || "u.", stock: 0 })
    .returning({ id: materiales.id });
  if (d.stock && d.stock > 0) await ajustarStock(m.id, d.stock, "Alta de material");
  return m;
}

export function fechaAhora() {
  const f = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return f.replace(",", "");
}

/** Genera el Excel con el MISMO formato que el archivo original del repo (hojas Materiales + Historial). */
export async function generarExcel(): Promise<Buffer> {
  await ensureReady();
  const mats = await db.select().from(materiales).orderBy(asc(materiales.orden), asc(materiales.id));
  const hist = await db
    .select({
      fecha: movimientos.fecha,
      usuario: movimientos.usuario,
      operacion: movimientos.operacion,
      material: movimientoItems.material,
      cantidad: movimientoItems.cantidad,
      uso: movimientos.uso,
      rastro: movimientos.rastro,
    })
    .from(movimientoItems)
    .innerJoin(movimientos, eq(movimientos.id, movimientoItems.movimientoId))
    .orderBy(asc(movimientos.id), asc(movimientoItems.id));

  const wsMat = XLSX.utils.aoa_to_sheet([
    [`Materiales y herramientas - María Grande - ${new Date().getFullYear()}`],
    ["DESCRIPCION", "ESPECIFICACION", "UNIDAD", "CANTIDAD"],
    ...mats.map((m) => [m.nombre, m.especificacion, m.unidad, m.stock]),
  ]);
  wsMat["!cols"] = [{ wch: 45 }, { wch: 60 }, { wch: 10 }, { wch: 10 }];
  const wsHist = XLSX.utils.aoa_to_sheet([
    ["Fecha", "Usuario", "Operacion", "Material", "Cantidad", "Uso"],
    ...hist.map((h) => [h.fecha, h.usuario, h.operacion, h.material, h.cantidad, h.rastro ? `${h.uso} [${h.rastro}]` : h.uso]),
  ]);
  wsHist["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 40 }, { wch: 9 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMat, "Materiales");
  XLSX.utils.book_append_sheet(wb, wsHist, "Historial");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function respuestaError(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Error interno del servidor." }, { status: 500 });
}
