"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import { BarChart3, TrendingUp, TrendingDown, Printer, FileDown } from "lucide-react";
import { formatCurrency, bookingStatuses, bookingSources } from "@/lib/utils";
import ExportButton from "@/components/ExportButton";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { generateOccupancyReportPDF, generateRevenueReportPDF } from "@/lib/reports-pdf";

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

interface OccupancyData {
  date: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  avgRate: number;
  revenue: number;
}

interface RevenueData {
  date: string;
  roomRevenue: number;
  folioRevenue: number;
  totalRevenue: number;
  payments: number;
}

const TABS = [
  { key: "occupancy", label: "Ocupacion" },
  { key: "revenue", label: "Ingresos" },
  { key: "bookings", label: "Reservas" },
  { key: "guests", label: "Huespedes" },
];

const PERIODS = [
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
];

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#6366f1"];

const sourceLabels: Record<string, string> = {
  direct: "Directo",
  booking: "Booking.com",
  expedia: "Expedia",
  airbnb: "Airbnb",
  phone: "Telefono",
  email: "Email",
  "walk-in": "Walk-in",
  other: "Otro",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("occupancy");
  const [chartPeriod, setChartPeriod] = useState("30d");
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const getToday = () => new Date().toISOString().split("T")[0];
  const getWeekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; };
  const getMonthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
  const getQuarterStart = () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split("T")[0]; };
  const getYearStart = () => `${new Date().getFullYear()}-01-01`;

  const getChartFromDate = () => {
    const days = PERIODS.find(p => p.key === chartPeriod)?.days || 30;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  useEffect(() => {
    fetch(`/api/reports?period=${period}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const loadChartData = useCallback(() => {
    const from = dateFrom || getChartFromDate();
    const to = dateTo || getToday();
    fetch(`/api/reports/occupancy?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => setOccupancyData(Array.isArray(d) ? d : []))
      .catch(() => setOccupancyData([]));
    fetch(`/api/reports/revenue?period=daily&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => setRevenueData(Array.isArray(d) ? d : []))
      .catch(() => setRevenueData([]));
  }, [chartPeriod, dateFrom, dateTo]);

  useEffect(() => { loadChartData(); }, [loadChartData]);

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

  const avgOccupancy = occupancyData.length > 0 ? Math.round(occupancyData.reduce((s, d) => s + d.occupancyRate, 0) / occupancyData.length) : data.occupancyRate;
  const totalChartRevenue = revenueData.reduce((s, d) => s + d.totalRevenue, 0);
  const totalPayments = revenueData.reduce((s, d) => s + d.payments, 0);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const hotelRes = await fetch("/api/hotels").then(r => r.json());
      const hotel = { name: hotelRes?.name || "Hotel", currency: hotelRes?.currency || "USD" };

      if (activeTab === "occupancy") {
        const doc = generateOccupancyReportPDF(occupancyData, hotel);
        doc.save(`reporte-ocupacion-${getToday()}.pdf`);
      } else if (activeTab === "revenue") {
        const doc = generateRevenueReportPDF(revenueData, hotel);
        doc.save(`reporte-ingresos-${getToday()}.pdf`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    const type = activeTab === "occupancy" ? "occupancy" : activeTab === "revenue" ? "revenue" : "occupancy";
    const from = dateFrom || getChartFromDate();
    const to = dateTo || getToday();
    window.open(`/print/report?type=${type}&from=${from}&to=${to}`, "_blank");
  };

  const pieData = data.bookingsBySource.map(s => ({
    name: sourceLabels[s.source] || s.source,
    value: s.count,
    revenue: s.revenue,
  }));

  const statusPieData = data.bookingsByStatus.map(s => {
    const status = bookingStatuses.find(bs => bs.value === s.status);
    return { name: status?.label || s.status, value: s.count };
  });

  const guestsPerMonth = data.monthlyRevenue.map(m => ({
    month: m.month,
    guests: Math.round(m.income / (data.avgRate || 100)),
    isVip: Math.random() > 0.7,
  }));

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Reportes
          </h1>
          <div className="flex gap-2 flex-wrap">
            <ExportButton entity="bookings" label="Exportar" from={period === "week" ? getWeekAgo() : period === "month" ? getMonthStart() : period === "quarter" ? getQuarterStart() : getYearStart()} to={getToday()} />
            <button onClick={handleExportPDF} disabled={exporting} className="btn-secondary inline-flex items-center gap-1.5">
              <FileDown className="h-4 w-4" />
              {exporting ? "Generando..." : "Exportar PDF"}
            </button>
            <button onClick={handlePrint} className="btn-secondary inline-flex items-center gap-1.5">
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <select
              value={period}
              onChange={e => { setPeriod(e.target.value); setLoading(true); }}
              className="input-field w-auto"
            >
              <option value="week">Ultima semana</option>
              <option value="month">Este mes</option>
              <option value="quarter">Ultimo trimestre</option>
              <option value="year">Este ano</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Ocupacion" value={`${avgOccupancy}%`} icon={TrendingUp} color="bg-blue-500" />
          <StatsCard title="Ingresos" value={formatCurrency(data.totalRevenue)} icon={TrendingUp} color="bg-green-500" />
          <StatsCard title="Gastos" value={formatCurrency(data.totalExpenses)} icon={TrendingDown} color="bg-red-500" />
          <StatsCard title="RevPAR" value={formatCurrency(data.revpar)} icon={BarChart3} color="bg-purple-500" />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white shadow text-blue-700" : "text-gray-600 hover:text-gray-900"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setChartPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${chartPeriod === p.key ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field py-1.5 text-sm" />
            <span className="text-gray-400">-</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field py-1.5 text-sm" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 hover:text-gray-700">Limpiar</button>
            )}
          </div>
        </div>

        {activeTab === "occupancy" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 font-medium">Ocupacion Media</p>
                <p className="text-2xl font-bold text-blue-700">{avgOccupancy}%</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 font-medium">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalChartRevenue)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-600 font-medium">Tarifa Media</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(data.avgRate)}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-600 font-medium">Habitaciones</p>
                <p className="text-2xl font-bold text-amber-700">{occupancyData[0]?.totalRooms || 0}</p>
              </div>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasa de Ocupacion</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v}%`, "Ocupacion"]} />
                  <Line type="monotone" dataKey="occupancyRate" stroke="#3b82f6" strokeWidth={2} dot={false} name="Ocupacion" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 font-medium">Ingresos Hab.</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(revenueData.reduce((s, d) => s + d.roomRevenue, 0))}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 font-medium">Folio</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(revenueData.reduce((s, d) => s + d.folioRevenue, 0))}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalChartRevenue)}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-600 font-medium">Pagos</p>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalPayments)}</p>
              </div>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Desglose de Ingresos</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="roomRevenue" fill="#3b82f6" name="Habitaciones" />
                  <Bar dataKey="folioRevenue" fill="#10b981" name="Folio" />
                  <Bar dataKey="totalRevenue" fill="#8b5cf6" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Reservas por Canal</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"                       label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
                )}
              </div>
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Reservas</h2>
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusPieData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "guests" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 font-medium">Huespedes Totales</p>
                <p className="text-2xl font-bold text-blue-700">{data.totalBookings}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-600 font-medium">VIP</p>
                <p className="text-2xl font-bold text-amber-700">
                  {data.topGuests.length > 0 ? Math.round((data.topGuests.filter(g => g.bookings > 1).length / Math.max(data.topGuests.length, 1)) * 100) : 0}%
                </p>
              </div>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevos Huespedes por Mes</h2>
              {guestsPerMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={guestsPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="guests" fill="#3b82f6" name="Huespedes" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Sin datos</p>
              )}
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Huespedes Frecuentes</h2>
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
        )}

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
