import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastFn = (msg: string, error?: boolean) => void;
const Ctx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; error: boolean; show: boolean }>({ msg: "", error: false, show: false });
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback<ToastFn>((msg, error = false) => {
    setT({ msg, error, show: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT((p) => ({ ...p, show: false })), 4000);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div
        role="status"
        className={`pointer-events-none fixed bottom-6 left-4 right-4 z-[200] mx-auto max-w-md rounded-xl px-5 py-4 text-center font-medium text-white shadow-xl transition-all duration-300 sm:left-auto sm:right-8 sm:mx-0 ${
          t.error ? "bg-red-500" : "bg-slate-900"
        } ${t.show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
      >
        {t.msg}
      </div>
    </Ctx.Provider>
  );
}
