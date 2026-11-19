"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      <Loader2 className="animate-spin" />
    </div>
  ),
});

export default function ClientApp() {
  return <App />;
}
