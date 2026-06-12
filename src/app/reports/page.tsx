'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import {
  BarChart3,
  TrendingUp,
  CalendarDays,
  Download,
  PieChart,
  Target,
  BedDouble,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReportsData {
  period: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  totalRevenue: number;
  totalExpenses: number;
  netRevenue: number;
  avgNights: number;
  bookingsBySource: { source: string; count: number }[];
  occupancyByDay: { date: string; occupancy: number; available: number }[];
  topRooms: { roomNumber: string; roomType: string; bookings: number; revenue: number }[];
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const sourceLabels: Record<string, string> = {
  direct: 'Directo',
  booking: 'Booking.com',
  expedia: 'Expedia',
  airbnb: 'Airbnb',
  phone: 'Teléfono',
  email: 'Email',
  'walk-in': 'Walk-in',
  other: 'Otro',
};

const sourceColors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-gray-500',
];

function OccupancyChart({ data }: { data: { date: string; occupancy: number }[] }) {
  const w = 700;
  const h = 220;
  const px = 40;
  const py = 16;
  const chartW = w - px * 2;
  const chartH = h - py * 2;

  const maxOcc = 100;
  const barW = Math.max(4, Math.min(20, chartW / data.length - 2));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[0, 25, 50, 75, 100].map((v) => {
        const y = py + chartH - (v / maxOcc) * chartH;
        return (
          <g key={v}>
            <line
              x1={px}
              y1={y}
              x2={px + chartW}
              y2={y}
              className="stroke-gray-100"
              strokeWidth="1"
            />
            <text x={px - 6} y={y + 3} textAnchor="end" className="fill-gray-400 text-[9px]">
              {v}%
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = px + (i / data.length) * chartW + (chartW / data.length - barW) / 2;
        const barH = (d.occupancy / maxOcc) * chartH;
        const y = py + chartH - barH;
        const color = d.occupancy >= 80 ? '#22c55e' : d.occupancy >= 50 ? '#eab308' : '#ef4444';
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={2}
              fill={color}
              className="transition-all duration-300"
            />
            {data.length <= 31 && (
              <text
                x={x + barW / 2}
                y={h - 2}
                textAnchor="middle"
                className="fill-gray-400 text-[7px]"
              >
                {d.date.slice(8)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SourceBars({ data }: { data: { source: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>;

  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-3">
      {sorted.map((item, i) => {
        const pct = Math.round((item.count / total) * 100);
        return (
          <div key={item.source}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium">
                {sourceLabels[item.source] || item.source}
              </span>
              <span className="text-gray-500">
                {item.count} ({pct}%)
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${sourceColors[i % sourceColors.length]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`${color} p-2.5 rounded-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports?period=${period}&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/reports?period=${period}&year=${year}&month=${month}`);
      const d: ReportsData = await res.json();
      const rows = [
        ['Metrica', 'Valor'],
        ['Total Reservas', String(d.totalBookings)],
        ['Reservas Completadas', String(d.completedBookings)],
        ['Canceladas', String(d.cancelledBookings)],
        ['Tasa Cancelacion', `${d.cancellationRate}%`],
        ['Ingresos', String(d.totalRevenue)],
        ['Gastos', String(d.totalExpenses)],
        ['Neto', String(d.netRevenue)],
        ['Prom. Noches', String(d.avgNights.toFixed(1))],
        ...d.bookingsBySource.map((s) => [
          `Reservas ${sourceLabels[s.source] || s.source}`,
          String(s.count),
        ]),
        ...d.topRooms.map((r) => [
          `Hab. ${r.roomNumber} (${r.roomType}) - Reservas`,
          String(r.bookings),
        ]),
        ...d.topRooms.map((r) => [
          `Hab. ${r.roomNumber} (${r.roomType}) - Ingresos`,
          String(r.revenue),
        ]),
      ];
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${period}-${year}-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const kpiData = data
    ? [
        {
          title: 'Total Reservas',
          value: String(data.totalBookings),
          subtitle: `${data.completedBookings} completadas`,
          icon: CalendarDays,
          color: 'bg-blue-500',
        },
        {
          title: 'Tasa Cancelación',
          value: `${data.cancellationRate}%`,
          subtitle: `${data.cancelledBookings} canceladas`,
          icon: TrendingUp,
          color: 'bg-red-500',
        },
        {
          title: 'Ingresos',
          value: formatCurrency(data.totalRevenue),
          subtitle: `Gastos: ${formatCurrency(data.totalExpenses)}`,
          icon: DollarSign,
          color: 'bg-emerald-500',
        },
        {
          title: 'Neto',
          value: formatCurrency(data.netRevenue),
          icon: BarChart3,
          color: data.netRevenue >= 0 ? 'bg-emerald-500' : 'bg-red-500',
        },
        {
          title: 'Prom. Noches',
          value: data.avgNights.toFixed(1),
          icon: BedDouble,
          color: 'bg-violet-500',
        },
        {
          title: 'Ocupación Media',
          value:
            data.occupancyByDay.length > 0
              ? `${Math.round(data.occupancyByDay.reduce((s, d) => s + d.occupancy, 0) / data.occupancyByDay.length)}%`
              : '—',
          icon: Target,
          color: 'bg-amber-500',
        },
      ]
    : [];

  return (
    <div>
      <Header />
      <div className="p-4 md:p-6 space-y-6 max-w-[1440px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Reportes
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPeriod('month')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === 'month' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Mes
              </button>
              <button
                onClick={() => setPeriod('year')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === 'year' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Año
              </button>
            </div>
            {period === 'month' && (
              <>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="input-field w-auto text-sm py-1.5"
                >
                  {MONTHS.map((name, i) => (
                    <option key={i} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="input-field w-auto text-sm py-1.5"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
                    (y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    )
                  )}
                </select>
              </>
            )}
            {period === 'year' && (
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="input-field w-auto text-sm py-1.5"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        )}

        {!loading && data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {kpiData.map((k) => (
                <KpiCard key={k.title} {...k} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Ocupación Diaria
                  </h2>
                  <span className="text-xs text-gray-400">
                    {period === 'year' ? `Año ${year}` : `${MONTHS[month - 1]} ${year}`}
                  </span>
                </div>
                {data.occupancyByDay.length > 0 ? (
                  <OccupancyChart data={data.occupancyByDay} />
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Sin datos de ocupación</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-violet-500" />
                    Ingresos por Canal
                  </h2>
                </div>
                <SourceBars data={data.bookingsBySource} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-blue-500" />
                  Top Habitaciones
                </h2>
                <span className="text-xs text-gray-400">Por ingresos</span>
              </div>
              {data.topRooms.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 text-gray-500 font-medium">#</th>
                        <th className="text-left py-3 px-2 text-gray-500 font-medium">
                          Habitación
                        </th>
                        <th className="text-left py-3 px-2 text-gray-500 font-medium">Tipo</th>
                        <th className="text-right py-3 px-2 text-gray-500 font-medium">Reservas</th>
                        <th className="text-right py-3 px-2 text-gray-500 font-medium">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topRooms.map((r, i) => (
                        <tr
                          key={r.roomNumber}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-2 text-gray-400">{i + 1}</td>
                          <td className="py-3 px-2 font-medium text-gray-900">{r.roomNumber}</td>
                          <td className="py-3 px-2 text-gray-500">{r.roomType}</td>
                          <td className="py-3 px-2 text-right text-gray-700">{r.bookings}</td>
                          <td className="py-3 px-2 text-right font-medium text-gray-900">
                            {formatCurrency(r.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos de habitaciones</p>
              )}
            </div>
          </>
        )}

        {!loading && !data && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay datos disponibles para este período</p>
          </div>
        )}
      </div>
    </div>
  );
}
