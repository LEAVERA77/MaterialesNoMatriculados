import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { buscarMateriales } from "../data/materiales";

export interface ItemState {
  key: number;
  query: string;
  material: string;
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
            onChange({ query: e.target.value, material: "", unidad: "" });
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
                key={m.display}
                className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-50 hover:text-blue-600"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ query: m.nombre + (m.especificacion ? ` · ${m.especificacion}` : ""), material: m.nombre, unidad: m.unidad });
                  setOpen(false);
                }}
              >
                <span className="font-medium">{m.nombre}</span>
                {m.especificacion && <span className="text-slate-500"> · {m.especificacion}</span>}
                <span className="text-slate-400"> ({m.unidad})</span>
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
      <input className="input min-w-[90px] flex-1" placeholder="Unidad" readOnly value={item.unidad} />
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
