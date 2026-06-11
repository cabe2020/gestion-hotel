"use client";

import { formatCurrency } from "@/lib/utils";

interface ReportPrintProps {
  title: string;
  data: Record<string, unknown>[];
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  hotel: { name: string };
  summary?: { label: string; value: string }[];
}

export default function ReportPrint({ title, data, columns, hotel, summary }: ReportPrintProps) {
  return (
    <div className="print-container">
      <div className="border-b-2 border-gray-900 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{hotel.name}</h2>
        <h3 className="text-lg font-semibold text-gray-700 mt-1">{title}</h3>
        <p className="text-sm text-gray-600">Generado: {new Date().toLocaleDateString("es")}</p>
      </div>

      {summary && summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {summary.map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-2 px-3 font-semibold text-gray-700 ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2 px-3 ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
