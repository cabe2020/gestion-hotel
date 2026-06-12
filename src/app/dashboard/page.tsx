'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import {
  BedDouble,
  CalendarCheck,
  Users,
  DollarSign,
  LogIn,
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bell,
  TrendingUp,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate, bookingStatuses } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from '@/components/I18nProvider';

interface TodayBooking {
  id: string;
  code: string;
  guest: { id: string; firstName: string; lastName: string; phone: string };
  room: { id: string; number: string; roomType: { name: string } };
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface Comparison {
  occupancyDiff: number;
  prevWeekOccupancyRate: number;
  revenueDiff: number;
  revenueAmountDiff: number;
  sameDayLastWeekRevenue: number;
  bookingsDiff: number;
  yesterdayBookingsCount: number;
  todayNewBookings: number;
}

interface DashboardData {
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  todayCheckins: number;
  todayCheckouts: number;
  totalGuests: number;
  activeBookings: number;
  todayRevenue: number;
  todayExpenses: number;
  recentBookings: {
    id: string;
    status: string;
    checkIn: string;
    createdAt?: string;
    guest?: { firstName: string; lastName: string };
    room?: { number: string };
  }[];
  roomsByStatus: { status: string; _count: { status: number } }[];
  revenueChart: { date: string; income: number; expense: number }[];
  currency: string;
  comparison: Comparison;
  todayArrivals: TodayBooking[];
  todayDepartures: TodayBooking[];
  notifications: Notification[];
}

function TrendIndicator({ value, label }: { value: number; label: string }) {
  if (value === 0)
    return <span className="text-xs text-gray-400 dark:text-gray-500">Igual vs. {label}</span>;
  const positive = value > 0;
  return (
    <span
      className={`text-xs flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-500'}`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positive ? '+' : ''}
      {value}% vs. {label}
    </span>
  );
}

function OccupancyDonut({
  occupancyRate,
  occupiedRooms,
  totalRooms,
  roomsByStatus,
  statusLabels,
  statusColors,
}: {
  occupancyRate: number;
  occupiedRooms: number;
  totalRooms: number;
  roomsByStatus: { status: string; _count: { status: number } }[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}) {
  const radius = 58;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (occupancyRate / 100) * circumference;
  const center = radius;

  const ringSegments = roomsByStatus.filter((s) => s._count.status > 0);
  const totalSegments = ringSegments.reduce((s, r) => s + r._count.status, 0);

  const segmentColors: Record<string, string> = {
    available: '#22c55e',
    occupied: '#3b82f6',
    maintenance: '#eab308',
    'out-of-order': '#ef4444',
    cleaning: '#a855f7',
  };

  const arcs = ringSegments.map((seg, index) => {
    const fraction = seg._count.status / (totalSegments || 1);
    const startAngle = ringSegments
      .slice(0, index)
      .reduce((sum, s) => sum + s._count.status / (totalSegments || 1), 0) * circumference;
    const arcLength = fraction * circumference;

    const strokeDashOffset = circumference - startAngle - arcLength;
    const strokeDashArray = `${arcLength} ${circumference - arcLength}`;

    return (
      <circle
        key={seg.status}
        r={normalizedRadius}
        cx={center}
        cy={center}
        fill="transparent"
        stroke={segmentColors[seg.status] || '#9ca3af'}
        strokeWidth={stroke}
        strokeDasharray={strokeDashArray}
        strokeDashoffset={-startAngle}
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-700"
      />
    );
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg height={radius * 2} width={radius * 2} className="-rotate-0">
          <circle
            r={normalizedRadius}
            cx={center}
            cy={center}
            fill="transparent"
            stroke="currentColor"
            className="text-gray-100 dark:text-gray-700"
            strokeWidth={stroke}
          />
          {arcs}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{occupancyRate}%</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Ocupación
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {roomsByStatus.map((s) => (
          <div key={s.status} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: segmentColors[s.status] || '#9ca3af' }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {statusLabels[s.status] || s.status}
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              {s._count.status}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">{totalRooms}</span>
        </div>
      </div>
    </div>
  );
}

function TooltipLine({
  values,
  max,
  px,
  py,
  chartW,
  chartH,
}: {
  values: number[];
  max: number;
  px: number;
  py: number;
  chartW: number;
  chartH: number;
}) {
  return (
    <>
      {values.map((v, i) => {
        const x = px + (i / (values.length - 1 || 1)) * chartW;
        const y = py + chartH - (v / max) * chartH;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            className="fill-current opacity-0 group-hover:opacity-100 transition-opacity"
          />
        );
      })}
    </>
  );
}

function RevenueAreaChart({
  data,
  currency,
}: {
  data: { date: string; income: number; expense: number }[];
  currency: string;
}) {
  const maxIncome = Math.max(...data.map((d) => d.income), 1);
  const w = 520;
  const h = 140;
  const px = 40;
  const py = 10;
  const chartW = w - px * 2;
  const chartH = h - py * 2;

  const points = (values: number[]) => {
    const max = Math.max(...values, 1);
    return values
      .map((v, i) => {
        const x = px + (i / (values.length - 1 || 1)) * chartW;
        const y = py + chartH - (v / max) * chartH;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const areaPoints = (values: number[]) => {
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => {
      const x = px + (i / (values.length - 1 || 1)) * chartW;
      const y = py + chartH - (v / max) * chartH;
      return { x, y };
    });
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    return `${px},${py + chartH} ${line} ${px + chartW},${py + chartH}`;
  };

  const incomeValues = data.map((d) => d.income);
  const expenseValues = data.map((d) => d.expense);

  return (
    <div className="group relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = py + chartH * (1 - frac);
          const val = Math.round(maxIncome * frac);
          return (
            <g key={frac}>
              <line
                x1={px}
                y1={y}
                x2={px + chartW}
                y2={y}
                className="stroke-gray-100 dark:stroke-gray-700"
                strokeWidth="1"
              />
              <text
                x={px - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-gray-400 dark:fill-gray-500 text-[9px]"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        <polygon
          points={areaPoints(expenseValues)}
          fill="url(#expenseGrad)"
          className="transition-all duration-500"
        />
        <polyline
          points={points(expenseValues)}
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-60"
        />

        <polygon
          points={areaPoints(incomeValues)}
          fill="url(#incomeGrad)"
          className="transition-all duration-500"
        />
        <polyline
          points={points(incomeValues)}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const x = px + (i / (data.length - 1 || 1)) * chartW;
          return (
            <text
              key={d.date}
              x={x}
              y={h - 1}
              textAnchor="middle"
              className="fill-gray-400 dark:fill-gray-500 text-[9px]"
            >
              {d.date.slice(8)}
            </text>
          );
        })}

        <TooltipLine
          values={incomeValues}
          max={maxIncome}
          px={px}
          py={py}
          chartW={chartW}
          chartH={chartH}
        />
      </svg>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Ingresos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Gastos</span>
        </div>
        <div className="ml-auto">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Total 7d:{' '}
            {formatCurrency(
              data.reduce((s, d) => s + d.income, 0),
              currency
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ values, color = '#3b82f6' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const w = 60;
  const h = 20;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-14 h-4 shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityTimeline({
  bookings,
}: {
  bookings: {
    id: string;
    status: string;
    checkIn: string;
    createdAt?: string;
    guest?: { firstName: string; lastName: string };
    room?: { number: string };
  }[];
}) {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />;
      case 'checked-in':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'checked-out':
        return <LogOut className="h-3.5 w-3.5 text-gray-400" />;
      case 'cancelled':
        return <X className="h-3.5 w-3.5 text-red-400" />;
      case 'no-show':
        return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmada',
    'checked-in': 'Check-in',
    'checked-out': 'Check-out',
    cancelled: 'Cancelada',
    'no-show': 'No Show',
  };

  return (
    <div className="relative">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100 dark:bg-gray-700" />
      <div className="space-y-4">
        {bookings.map((booking, i) => {
          const status = bookingStatuses.find((s) => s.value === booking.status);
          return (
            <div key={booking.id} className="flex items-start gap-3 relative">
              <div className="relative z-10 bg-white dark:bg-gray-800 p-0.5">
                {statusIcon(booking.status)}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {booking.guest?.firstName} {booking.guest?.lastName}
                  </p>
                  {status && <StatusBadge label={status.label} color={status.color} />}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Hab. {booking.room?.number} &middot; {formatDate(booking.checkIn)}
                </p>
              </div>
            </div>
          );
        })}
        {bookings.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            Sin actividad reciente
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { t } = useTranslations();

  const fetchData = useCallback(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLastRefresh(new Date());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      const es = new EventSource('/api/dashboard/stream');
      eventSourceRef.current = es;

      es.onopen = () => setIsLive(true);
      es.onmessage = (event) => {
        try {
          const summary = JSON.parse(event.data);
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              occupancyRate: summary.occupancyRate,
              todayCheckins: summary.todayCheckins,
              todayCheckouts: summary.todayCheckouts,
              todayRevenue: summary.todayRevenue,
              activeBookings: summary.newBookings ?? prev.activeBookings,
            };
          });
          setLastRefresh(new Date());
        } catch {}
      };
      es.onerror = () => {
        setIsLive(false);
        es.close();
        eventSourceRef.current = null;
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsLive(false);
    };
  }, [fetchData]);

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    'out-of-order': 'bg-red-100 text-red-800',
    cleaning: 'bg-purple-100 text-purple-800',
  };

  const statusLabels: Record<string, string> = {
    available: t('status.available'),
    occupied: t('status.occupied'),
    maintenance: t('status.maintenance'),
    'out-of-order': t('status.outOfOrder'),
    cleaning: t('status.cleaning'),
  };

  const incomeSparkline = useMemo(
    () => data?.revenueChart.map((d) => d.income) || [],
    [data?.revenueChart]
  );
  const expenseSparkline = useMemo(
    () => data?.revenueChart.map((d) => d.expense) || [],
    [data?.revenueChart]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 md:p-8">
        <div className="card text-center py-12">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('dash.noData')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('dash.noDataDesc')}</p>
          <button
            onClick={async () => {
              await fetch('/api/seed', { method: 'POST' });
              window.location.reload();
            }}
            className="btn-primary"
          >
            {t('dash.createSample')}
          </button>
        </div>
      </div>
    );
  }

  const comp = data.comparison;

  return (
    <div>
      <Header />
      <div className="p-4 md:p-6 space-y-6 max-w-[1440px] mx-auto">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('page.dashboard')}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span>{formatDate(new Date())}</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={fetchData}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="text-xs">
                  {t('common.updated')} {lastRefresh.toLocaleTimeString('es-ES')}
                </span>
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span
                className={`flex items-center gap-1 text-xs ${isLive ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`}
                />
                En vivo
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/bookings?action=new"
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {t('btn.newBooking')}
            </Link>
            <Link
              href="/checkin"
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="h-4 w-4" />
              {t('nav.checkin')}
            </Link>
            <Link
              href="/checkout"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              {t('nav.checkout')}
            </Link>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('dash.occupancy')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {data.occupancyRate}%
                </p>
                <TrendIndicator value={comp.occupancyDiff} label={t('common.vsLastWeek')} />
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-lg">
                  <BedDouble className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <MiniSparkline values={incomeSparkline} color="#3b82f6" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {data.occupiedRooms}/{data.totalRooms} hab.
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('dash.todayRevenue')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(data.todayRevenue, data.currency)}
                </p>
                <TrendIndicator value={comp.revenueDiff} label={t('common.vsLastWeek')} />
                {comp.revenueAmountDiff !== 0 && (
                  <p
                    className={`text-xs mt-0.5 ${comp.revenueAmountDiff > 0 ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    {comp.revenueAmountDiff > 0 ? '+' : ''}
                    {formatCurrency(comp.revenueAmountDiff, data.currency)}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <MiniSparkline values={incomeSparkline} color="#10b981" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Gastos: {formatCurrency(data.todayExpenses, data.currency)}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 ml-auto">
                Neto: {formatCurrency(data.todayRevenue - data.todayExpenses, data.currency)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('dash.activeBookings')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {data.activeBookings}
                </p>
                <TrendIndicator value={comp.bookingsDiff} label="ayer" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="bg-violet-50 dark:bg-violet-900/30 p-2.5 rounded-lg">
                  <CalendarCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <MiniSparkline
                  values={[comp.yesterdayBookingsCount || 0, comp.todayNewBookings || 0]}
                  color="#8b5cf6"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Nuevas hoy: {comp.todayNewBookings}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('dash.guests')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {data.totalGuests}
                </p>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Huéspedes registrados
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
              <span className="flex items-center gap-1 text-xs">
                <LogIn className="h-3 w-3 text-green-500" />
                <span className="text-gray-500 dark:text-gray-400">
                  {data.todayCheckins} entradas
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <LogOut className="h-3 w-3 text-orange-500" />
                <span className="text-gray-500 dark:text-gray-400">
                  {data.todayCheckouts} salidas
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Chart + Occupancy Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('dash.revenue7days')}
              </h2>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Últimos 7 días</span>
              </div>
            </div>
            <RevenueAreaChart data={data.revenueChart} currency={data.currency} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {t('dash.roomStatus')}
            </h2>
            <OccupancyDonut
              occupancyRate={data.occupancyRate}
              occupiedRooms={data.occupiedRooms}
              totalRooms={data.totalRooms}
              roomsByStatus={data.roomsByStatus}
              statusLabels={statusLabels}
              statusColors={statusColors}
            />
          </div>
        </div>

        {/* Arrivals / Departures / Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <LogIn className="h-4 w-4 text-green-500" />
                {t('dash.arrivalsToday')}
              </h2>
              <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold">
                {data.todayArrivals.length}
              </span>
            </div>
            {data.todayArrivals.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                {t('dash.noArrivals')}
              </p>
            ) : (
              <div className="space-y-2">
                {data.todayArrivals.map((b) => {
                  const status = bookingStatuses.find((s) => s.value === b.status);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {b.guest.firstName} {b.guest.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Hab. {b.room.number} ({b.room.roomType?.name})
                        </p>
                        {b.guest.phone && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {b.guest.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {status && <StatusBadge label={status.label} color={status.color} />}
                        {b.status === 'confirmed' && (
                          <Link
                            href="/checkin"
                            className="p-1.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                            title="Check-in rápido"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <LogOut className="h-4 w-4 text-orange-500" />
                {t('dash.departuresToday')}
              </h2>
              <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-xs font-bold">
                {data.todayDepartures.length}
              </span>
            </div>
            {data.todayDepartures.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                {t('dash.noDepartures')}
              </p>
            ) : (
              <div className="space-y-2">
                {data.todayDepartures.map((b) => {
                  const status = bookingStatuses.find((s) => s.value === b.status);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {b.guest.firstName} {b.guest.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Hab. {b.room.number} ({b.room.roomType?.name})
                        </p>
                        {b.guest.phone && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {b.guest.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {status && <StatusBadge label={status.label} color={status.color} />}
                        {b.status === 'checked-in' && (
                          <Link
                            href="/checkout"
                            className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/30 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                            title="Check-out rápido"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                {t('dash.recentBookings')}
              </h2>
              <Link
                href="/bookings"
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Ver todas
              </Link>
            </div>
            <ActivityTimeline bookings={data.recentBookings} />
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              {t('dash.notifications')}
            </h2>
            {data.notifications.filter((n) => !n.read).length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-bold">
                {data.notifications.filter((n) => !n.read).length}
              </span>
            )}
          </div>
          {data.notifications.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              {t('dash.noNotifications')}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.notifications.map((n) => {
                const typeStyles: Record<string, string> = {
                  info: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20',
                  warning:
                    'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20',
                  error: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20',
                  success:
                    'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20',
                };
                return (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border ${typeStyles[n.type] || 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20'} ${n.read ? 'opacity-50' : ''}`}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(n.createdAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
