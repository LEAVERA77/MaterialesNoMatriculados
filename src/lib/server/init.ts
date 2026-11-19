import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { materiales, movimientoItems, movimientos, usuarios } from "@/db/schema";
import { USUARIOS } from "@/data/usuarios";
import { MATERIALES } from "@/data/materiales";

const EXCEL_PATH = path.join(process.cwd(), "data", "listado_materiales_ENERSA.xlsx");

const DDL = `
CREATE TABLE IF NOT EXISTS "usuarios" (
  "legajo" text PRIMARY KEY NOT NULL,
  "apellido" text NOT NULL,
  "nombre" text NOT NULL,
  "activo" boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS "materiales" (
  "id" serial PRIMARY KEY NOT NULL,
  "nombre" text NOT NULL,
  "especificacion" text DEFAULT '' NOT NULL,
  "unidad" text DEFAULT 'u.' NOT NULL,
  "stock" double precision DEFAULT 0 NOT NULL,
  "orden" integer DEFAULT 0 NOT NULL,
  "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "materiales_nombre_especificacion_unique" UNIQUE("nombre","especificacion")
);
CREATE TABLE IF NOT EXISTS "movimientos" (
  "id" serial PRIMARY KEY NOT NULL,
  "fecha" text NOT NULL,
  "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
  "usuario" text NOT NULL,
  "legajo" text,
  "operacion" text NOT NULL,
  "uso" text DEFAULT '' NOT NULL,
  "rastro" text DEFAULT '' NOT NULL,
  "dispositivo" jsonb,
  "origen" text DEFAULT 'app' NOT NULL
);
CREATE TABLE IF NOT EXISTS "movimiento_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "movimiento_id" integer NOT NULL,
  "material_id" integer,
  "material" text NOT NULL,
  "cantidad" double precision NOT NULL,
  "unidad" text DEFAULT '' NOT NULL,
  "stock_resultante" double precision
);
DO $$ BEGIN
  ALTER TABLE "movimiento_items" ADD CONSTRAINT "movimiento_items_movimiento_id_movimientos_id_fk"
    FOREIGN KEY ("movimiento_id") REFERENCES "public"."movimientos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "movimiento_items" ADD CONSTRAINT "movimiento_items_material_id_materiales_id_fk"
    FOREIGN KEY ("material_id") REFERENCES "public"."materiales"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
`;

let ready: Promise<void> | null = null;

/** Garantiza que existan las tablas y que los datos iniciales estén importados (una sola vez). */
export function ensureReady(): Promise<void> {
  if (!ready) {
    ready = inicializar().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown) => String(v ?? "").trim();

async function inicializar() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(774411)");
    await client.query(DDL);
  } finally {
    await client.query("SELECT pg_advisory_unlock(774411)").catch(() => {});
    client.release();
  }

  // Usuarios: siempre sincronizar el padrón (agrega nuevos legajos sin borrar)
  await db
    .insert(usuarios)
    .values(USUARIOS.map((u) => ({ legajo: u.legajo, apellido: u.apellido, nombre: u.nombre })))
    .onConflictDoNothing();

  const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from materiales`)).rows;
  if (n > 0) return;

  await importarExcelInicial();
}

async function importarExcelInicial() {
  let wb: XLSX.WorkBook | null = null;
  if (fs.existsSync(EXCEL_PATH)) {
    wb = XLSX.read(fs.readFileSync(EXCEL_PATH), { type: "buffer" });
  }

  const vistos = new Set<string>();
  const filasMat: { nombre: string; especificacion: string; unidad: string; stock: number; orden: number }[] = [];

  if (wb) {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    for (let i = 2; i < json.length; i++) {
      const r = json[i];
      const nombre = str(r?.[0]);
      const clave = `${nombre}|${str(r?.[1])}`.toLowerCase();
      if (!nombre || vistos.has(clave)) continue;
      vistos.add(clave);
      filasMat.push({
        nombre,
        especificacion: str(r[1]),
        unidad: str(r[2]) || "u.",
        stock: num(r[3]),
        orden: filasMat.length,
      });
    }
  }
  // Catálogo estático de la app: agrega los que no estén en el Excel (stock 0)
  for (const m of MATERIALES) {
    const clave = `${m.nombre}|${m.especificacion}`.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    filasMat.push({ nombre: m.nombre, especificacion: m.especificacion, unidad: m.unidad, stock: 0, orden: filasMat.length });
  }

  await db.transaction(async (tx) => {
    const insertados = await tx
      .insert(materiales)
      .values(filasMat)
      .onConflictDoNothing()
      .returning({ id: materiales.id, nombre: materiales.nombre, unidad: materiales.unidad });
    const porNombre = new Map<string, (typeof insertados)[number]>();
    for (const m of insertados) if (!porNombre.has(m.nombre.toLowerCase())) porNombre.set(m.nombre.toLowerCase(), m);

    if (!wb || !wb.SheetNames.includes("Historial")) return;
    const hist = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Historial"], { header: 1 });
    for (let i = 1; i < hist.length; i++) {
      const r = hist[i];
      if (!r || !r[0]) continue;
      let fecha = str(r[0]);
      if (typeof r[0] === "number") {
        const p = XLSX.SSF.parse_date_code(r[0]);
        if (p) fecha = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")} ${String(p.H).padStart(2, "0")}:${String(p.M).padStart(2, "0")}`;
      }
      const usoRaw = str(r[5]);
      const m = usoRaw.match(/\s*\[Leg\.[^\]]*\]\s*$/);
      const materialNombre = str(r[3]);
      const mat = porNombre.get(materialNombre.toLowerCase());
      const [mov] = await tx
        .insert(movimientos)
        .values({
          fecha,
          usuario: str(r[1]).toUpperCase(),
          operacion: str(r[2]).toUpperCase() || "RETIRO",
          uso: m ? usoRaw.replace(m[0], "") : usoRaw,
          rastro: m ? m[0].trim().replace(/^\[|\]$/g, "") : "",
          origen: "importado",
        })
        .returning({ id: movimientos.id });
      await tx.insert(movimientoItems).values({
        movimientoId: mov.id,
        materialId: mat?.id ?? null,
        material: materialNombre,
        cantidad: num(r[4]),
        unidad: mat?.unidad ?? "",
      });
    }
  });
}
