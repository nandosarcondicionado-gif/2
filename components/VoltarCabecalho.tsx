"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface VoltarCabecalhoProps {
  titulo: string;
  subtitulo?: string;
  children?: React.ReactNode;
}

export default function VoltarCabecalho({ titulo, subtitulo, children }: VoltarCabecalhoProps) {
  const router = useRouter();

  return (
    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors shadow-md"
          title="Voltar à página anterior"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{titulo}</h1>
          {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
