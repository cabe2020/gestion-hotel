"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReportPrint from "../ReportPrint";

export default function PrintCashContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const [moves, setMoves] = useState<any[]>([]);
  const [hotel, setHotel] = useState<{ name: string }>({ name: "" });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });

  useEffect(() => {
    fetch("/api/hotels").then((r) => r.json()).then((h) => { if (h) setHotel({ name: h.name }); });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", "1000");

    fetch(`/api/cash-moves?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        const data = res.data || res;
        setMoves(Array.isArray(data) ? data : []);
        const income = data.filter((m: any) => m.type === "income").reduce((s: number, m: any) => s + m.amount, 0);
        const expense = data.filter((m: any) => m.type === "expense").reduce((s: number, m: any) => s + m.amount, 0);
        setStats({ totalIncome: income, totalExpense: expense, balance: income - expense });
      })
      .catch(() => setMoves([]))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    if (!loading) {
      const timeout = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const columns = [
    { key: "date", label: "Fecha" },
    { key: "type", label: "Tipo", align: "center" as const },
    { key: "category", label: "Categoria" },
    { key: "concept", label: "Concepto" },
    { key: "method", label: "Metodo" },
    { key: "amount", label: "Monto", align: "right" as const },
  ];

  const categoryLabels: Record<string, string> = {
    "room-revenue": "Ingreso Habitacion",
    "food-beverage": "Alimentos y Bebidas",
    services: "Servicios",
    "other-income": "Otros Ingresos",
    salaries: "Salarios",
    supplies: "Suministros",
    maintenance: "Mantenimiento",
    utilities: "Servicios Publicos",
    "other-expense": "Otros Gastos",
  };

  const methodLabels: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    other: "Otro",
  };

  const formattedMoves = moves.map((m) => ({
    date: new Date(m.createdAt).toLocaleDateString("es"),
    type: m.type === "income" ? "Ingreso" : "Gasto",
    category: categoryLabels[m.category] || m.category,
    concept: m.concept,
    method: methodLabels[m.method] || m.method,
    amount: `${m.type === "income" ? "+" : "-"}$${m.amount.toFixed(2)}`,
  }));

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-4 print:max-w-none">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none; border: none; }
        }
      `}</style>
      <div className="no-print mb-4 flex gap-2">
        <button onClick={() => window.print()} className="btn-primary">Imprimir</button>
        <button onClick={() => window.close()} className="btn-secondary">Cerrar</button>
      </div>
      <ReportPrint
        title="Resumen de Caja"
        data={formattedMoves}
        columns={columns}
        hotel={hotel}
        summary={[
          { label: "Ingresos", value: `$${stats.totalIncome.toFixed(2)}` },
          { label: "Gastos", value: `$${stats.totalExpense.toFixed(2)}` },
          { label: "Balance", value: `$${stats.balance.toFixed(2)}` },
        ]}
      />
    </div>
  );
}
