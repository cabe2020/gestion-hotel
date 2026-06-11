"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, bookingStatuses } from "@/lib/utils";
import ExportButton from "@/components/ExportButton";

interface ReportData {
  totalBookings: number;
  totalRevenue: number;
  totalExpenses: number;
  occupancyRate: number;
  avgRate: number;
  revpar: number;
  bookingsBySource: { source: string; count: number; revenue: number }[];
  bookingsByStatus: { status: string; count: number }[];
  monthlyRevenue: { month: string; income: number; expense: number }[];
  topGuests: { name: string; bookings: number; totalSpent: number }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  const getToday = () => new Date().toISOString().split("T")[0];
  const getWeekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; };
  const getMonthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
  const getQuarterStart = () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split("T")[0]; };
  const getYearStart = () => `${new Date().getFullYear()}-01-01`;

  useEffect(() => {
    fetch(`/api/reports?period=${period}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="card text-center py-12">
          <p className="text-gray-500">No hay datos para mostrar</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...(data.monthlyRevenue?.map(m => m.income) || [1]));

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Reportes
          </h1>
            <div className="flex gap-2">
              <ExportButton entity="bookings" label="Exportar" from={period === "week" ? getWeekAgo() : period === "month" ? getMonthStart() : period === "quarter" ? getQuarterStart() : getYearStart()} to={getToday()} />
              <select
              value={period}
              onChange={e => {
                setPeriod(e.target.value);
                setLoading(true);
              }}
              className="input-field w-auto"
            >
              <option value="week">Última semana</option>
              <option value="month">Este mes</option>
              <option value="quarter">Último trimestre</option>
              <option value="year">Este año</option>
            </select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Ocupación" value={`${data.occupancyRate}%`} icon={TrendingUp} color="bg-blue-500" />
          <StatsCard title="Ingresos" value={formatCurrency(data.totalRevenue)} icon={TrendingUp} color="bg-green-500" />
          <StatsCard title="Gastos" value={formatCurrency(data.totalExpenses)} icon={TrendingDown} color="bg-red-500" />
          <StatsCard title="RevPAR" value={formatCurrency(data.revpar)} icon={BarChart3} color="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingresos Mensuales</h2>
            <div className="space-y-3">
              {data.monthlyRevenue?.map(m => (
                <div key={m.month} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{m.month}</span>
                    <span className="font-medium text-green-600">{formatCurrency(m.income)}</span>
                  </div>
                  <div className="flex gap-1 h-6">
                    <div
                      className="bg-green-500 rounded-l"
                      style={{ width: `${(m.income / maxRevenue) * 80}%` }}
                    />
                    {m.expense > 0 && (
                      <div
                        className="bg-red-400 rounded-r"
                        style={{ width: `${(m.expense / maxRevenue) * 20}%` }}
                      />
                    )}
                  </div>
                  {m.expense > 0 && (
                    <p className="text-xs text-red-500">Gastos: {formatCurrency(m.expense)}</p>
                  )}
                </div>
              ))}
              {(!data.monthlyRevenue || data.monthlyRevenue.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reservas por Canal</h2>
            <div className="space-y-3">
              {data.bookingsBySource?.map(s => {
                const maxCount = Math.max(...data.bookingsBySource.map(bs => bs.count)) || 1;
                return (
                  <div key={s.source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize">{s.source}</span>
                      <span className="font-medium">{s.count} ({formatCurrency(s.revenue)})</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${(s.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!data.bookingsBySource || data.bookingsBySource.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Reservas</h2>
            <div className="space-y-2">
              {data.bookingsByStatus?.map(s => {
                const status = bookingStatuses.find(bs => bs.value === s.status);
                return (
                  <div key={s.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.color || "bg-gray-100"}`}>
                      {status?.label || s.status}
                    </span>
                    <span className="text-lg font-bold text-gray-900">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Huéspedes Frecuentes</h2>
            <div className="space-y-2">
              {data.topGuests?.map((g, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-900">{g.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{g.bookings} reservas</p>
                    <p className="text-xs text-gray-500">{formatCurrency(g.totalSpent)}</p>
                  </div>
                </div>
              ))}
              {(!data.topGuests || data.topGuests.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen Financiero</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 font-medium">Ingresos Totales</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(data.totalRevenue)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600 font-medium">Gastos Totales</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(data.totalExpenses)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600 font-medium">Beneficio Neto</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.totalRevenue - data.totalExpenses)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-sm text-purple-600 font-medium">Tarifa Media</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(data.avgRate)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
