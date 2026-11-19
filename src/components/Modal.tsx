import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  toolbar?: ReactNode;
  headerExtra?: ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, footer, toolbar, headerExtra, maxWidth = "max-w-4xl" }: Props) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`fade-up flex max-h-[95vh] w-full ${maxWidth} flex-col rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">{title}</h2>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-500">
              <X size={22} />
            </button>
          </div>
        </div>
        {toolbar && <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row">{toolbar}</div>}
        <div className="flex-1 overflow-auto p-2 sm:p-5">{children}</div>
        {footer && (
          <div className="flex flex-col justify-end gap-3 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row">{footer}</div>
        )}
      </div>
    </div>
  );
}
