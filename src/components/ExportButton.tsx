"use client";

import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";

interface ExportButtonProps {
  entity: string;
  label?: string;
  from?: string;
  to?: string;
}

export default function ExportButton({ entity, label, from, to }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  const handleExport = (format: string) => {
    const params = new URLSearchParams({ entity, format });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/export?${params.toString()}`, "_blank");
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary inline-flex items-center gap-1.5"
      >
        <Download className="h-4 w-4" />
        {label || "Exportar"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            <button
              onClick={() => handleExport("csv")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
            >
              Exportar CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
