import { doublePrecision, integer, jsonb, pgTable, serial, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
  legajo: text("legajo").primaryKey(),
  apellido: text("apellido").notNull(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
});

export const materiales = pgTable("materiales", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  especificacion: text("especificacion").notNull().default(""),
  unidad: text("unidad").notNull().default("u."),
  stock: doublePrecision("stock").notNull().default(0),
  orden: integer("orden").notNull().default(0),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("materiales_nombre_especificacion_unique").on(t.nombre, t.especificacion)]);

export const movimientos = pgTable("movimientos", {
  id: serial("id").primaryKey(),
  fecha: text("fecha").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  usuario: text("usuario").notNull(),
  legajo: text("legajo"),
  operacion: text("operacion").notNull(), // RETIRO | DEVOLUCION | AJUSTE
  uso: text("uso").notNull().default(""),
  rastro: text("rastro").notNull().default(""),
  dispositivo: jsonb("dispositivo"),
  origen: text("origen").notNull().default("app"), // app | importado | ajuste
});

export const movimientoItems = pgTable("movimiento_items", {
  id: serial("id").primaryKey(),
  movimientoId: integer("movimiento_id")
    .notNull()
    .references(() => movimientos.id, { onDelete: "cascade" }),
  materialId: integer("material_id").references(() => materiales.id, { onDelete: "set null" }),
  material: text("material").notNull(),
  cantidad: doublePrecision("cantidad").notNull(),
  unidad: text("unidad").notNull().default(""),
  stockResultante: doublePrecision("stock_resultante"),
});
