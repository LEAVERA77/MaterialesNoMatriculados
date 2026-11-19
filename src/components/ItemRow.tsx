"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { buscarMateriales, stockDe } from "../data/materiales";

export interface ItemState {
  key: number;
  query: string;
  material: string;
  materialId?: number;
  unidad: string;
  cantidad: string;
}

interface Props {
  item: ItemState;
  index: number;
  canRemove: boolean;
  invalid: boolean;
  onChange: (patch: Partial<ItemState>) => void;
  onRemove: () => void;
}

export default function ItemRow({ item, index, canRemove, invalid, onChange, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const sugerencias = useMemo(() => (item.material ? [] : buscarMateriales(item.query)), [item.query, item.material]);

  const errMat = invalid && !item.material;
  const errQty = invalid && !(parseFloat(item.cantidad) > 0);

  return (
    <div className="relative flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-nowrap sm:p-4">
      <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
        {index + 1}
      </span>
      <div className="relative w-full sm:flex-[3]">
        <input
          className={`input ${errMat ? "invalid shake" : ""}`}
          placeholder="Buscar material..."
          autoComplete="off"
          value={item.query}
          onChange={(e) => {
            onChange({ query: e.target.value, material: "", materialId: undefined, unidad: "" });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {open && sugerencias.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            {sugerencias.map((m) => (
              <button
                type="button"
                key={m.id ?? m.display}
                className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-50 hover:text-blue-600"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ query: m.nombre + (m.especificacion ? ` · ${m.especificacion}` : ""), material: m.nombre, materialId: m.id, unidad: m.unidad });
                  setOpen(false);
                }}
              >
                <span className="font-medium">{m.nombre}</span>
                {m.especificacion && <span className="text-slate-500"> · {m.especificacion}</span>}
                <span className="text-slate-400"> ({m.unidad})</span>
                {m.stock !== undefined && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      m.stock <= 0 ? "bg-red-50 text-red-600" : m.stock < 5 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    Stock: {m.stock}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        placeholder="Cant."
        className={`input min-w-[80px] flex-1 ${errQty ? "invalid shake" : ""}`}
        value={item.cantidad}
        onChange={(e) => onChange({ cantidad: e.target.value })}
      />
      <div className="flex min-w-[90px] flex-1 flex-col">
        <input className="input" placeholder="Unidad" readOnly value={item.unidad} />
        {item.material && stockDe(item.materialId) !== undefined && (
          <span className="mt-1 text-center text-[11px] text-slate-500">Disp.: {stockDe(item.materialId)}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Quitar material"
        className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}
