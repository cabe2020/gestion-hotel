"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
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
} from "lucide-react";
import { formatCurrency, formatDate, bookingStatuses } from "@/lib/utils";
import Link from "next/link";

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

function TrendIndicator({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  if (value === 0)
    return (
      <span className="text-xs text-gray-400 mt-1">
        Igual vs. {label}
      </span>
    );
  const positive = value > 0;
  return (
    <span
      className={`text-xs mt-1 flex items-center gap-0.5 ${
        positive ? "text-green-600" : "text-red-600"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {positive ? "+" : ""}
      {value}% vs. {label}
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(() => {
    fetch("/api/dashboard")
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
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 md:p-8">
        <div className="card text-center py-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No hay datos
          </h2>
          <p className="text-gray-500 mb-4">
            Primero necesitas crear el hotel y datos iniciales.
          </p>
          <button
            onClick={async () => {
              await fetch("/api/seed", { method: "POST" });
              window.location.reload();
            }}
            className="btn-primary"
          >
            Crear datos de ejemplo
          </button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    occupied: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    "out-of-order": "bg-red-100 text-red-800",
    cleaning: "bg-purple-100 text-purple-800",
  };

  const statusLabels: Record<string, string> = {
    available: "Disponible",
    occupied: "Ocupada",
    maintenance: "Mantenimiento",
    "out-of-order": "Fuera de servicio",
    cleaning: "Limpieza",
  };

  const comp = data.comparison;

  return (
    <div>
      <Header />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>{formatDate(new Date())}</span>
              <span className="text-gray-300">|</span>
              <button
                onClick={fetchData}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="text-xs">
                  Actualizado {lastRefresh.toLocaleTimeString("es-ES")}
                </span>
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/bookings?action=new"
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Nueva Reserva
            </Link>
            <Link
              href="/checkin"
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="h-4 w-4" />
              Check-in
            </Link>
            <Link
              href="/checkout"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Check-out
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Ocupación"
            value={`${data.occupancyRate}%`}
            icon={BedDouble}
            color="bg-blue-500"
            trend={{
              value: comp.occupancyDiff,
              positive: comp.occupancyDiff >= 0,
            }}
          />
          <StatsCard
            title="Reservas Activas"
            value={data.activeBookings}
            icon={CalendarCheck}
            color="bg-green-500"
          />
          <StatsCard
            title="Huéspedes"
            value={data.totalGuests}
            icon={Users}
            color="bg-purple-500"
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Ingresos Hoy
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(data.todayRevenue, data.currency)}
                </p>
                <TrendIndicator
                  value={comp.revenueDiff}
                  label="sem. pasada"
                />
                {comp.revenueAmountDiff !== 0 && (
                  <p
                    className={`text-xs ${
                      comp.revenueAmountDiff > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {comp.revenueAmountDiff > 0 ? "+" : ""}
                    {formatCurrency(
                      comp.revenueAmountDiff,
                      data.currency
                    )}{" "}
                    vs. sem. pasada
                  </p>
                )}
              </div>
              <div className="bg-emerald-500 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card col-span-1 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ingresos últimos 7 días
            </h2>
            <div className="space-y-3">
              {data.revenueChart.map((day) => (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 w-20">
                    {day.date.slice(5)}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (day.income /
                              (Math.max(
                                ...data.revenueChart.map((d) => d.income)
                              ) ||
                                1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-24 text-right">
                      {formatCurrency(day.income, data.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Estado de Habitaciones
            </h2>
            <div className="space-y-3">
              {data.roomsByStatus.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center justify-between"
                >
                  <StatusBadge
                    label={statusLabels[s.status] || s.status}
                    color={
                      statusColors[s.status] || "bg-gray-100 text-gray-800"
                    }
                  />
                  <span className="text-lg font-bold text-gray-900">
                    {s._count.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {data.totalRooms}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Llegadas Hoy ({data.todayArrivals.length})
            </h2>
            {data.todayArrivals.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay llegadas programadas
              </p>
            ) : (
              <div className="space-y-3">
                {data.todayArrivals.map((b) => {
                  const status = bookingStatuses.find(
                    (s) => s.value === b.status
                  );
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {b.guest.firstName} {b.guest.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Hab. {b.room.number} ({b.room.roomType?.name}) -{" "}
                          {b.adults} adult{b.adults !== 1 ? "os" : "o"}
                          {b.children > 0 &&
                            `, ${b.children} niño${b.children !== 1 ? "s" : ""}`}
                        </p>
                        {b.guest.phone && (
                          <p className="text-xs text-gray-400">
                            {b.guest.phone}
                          </p>
                        )}
                      </div>
                      {status && (
                        <StatusBadge label={status.label} color={status.color} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Salidas Hoy ({data.todayDepartures.length})
            </h2>
            {data.todayDepartures.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay salidas programadas
              </p>
            ) : (
              <div className="space-y-3">
                {data.todayDepartures.map((b) => {
                  const status = bookingStatuses.find(
                    (s) => s.value === b.status
                  );
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {b.guest.firstName} {b.guest.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Hab. {b.room.number} ({b.room.roomType?.name})
                        </p>
                        {b.guest.phone && (
                          <p className="text-xs text-gray-400">
                            {b.guest.phone}
                          </p>
                        )}
                      </div>
                      {status && (
                        <StatusBadge label={status.label} color={status.color} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Reservas Recientes
            </h2>
            <div className="space-y-3">
              {data.recentBookings.map((booking) => {
                const status = bookingStatuses.find(
                  (s) => s.value === booking.status
                );
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {booking.guest?.firstName} {booking.guest?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Hab. {booking.room?.number} -{" "}
                        {formatDate(booking.checkIn)}
                      </p>
                    </div>
                    {status && (
                      <StatusBadge label={status.label} color={status.color} />
                    )}
                  </div>
                );
              })}
              {data.recentBookings.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay reservas
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-600" />
              Notificaciones
            </h2>
            {data.notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay notificaciones
              </p>
            ) : (
              <div className="space-y-3">
                {data.notifications.map((n) => {
                  const typeColors: Record<string, string> = {
                    info: "border-blue-300 bg-blue-50",
                    warning: "border-yellow-300 bg-yellow-50",
                    error: "border-red-300 bg-red-50",
                    success: "border-green-300 bg-green-50",
                  };
                  return (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border ${
                        typeColors[n.type] || "border-gray-200 bg-gray-50"
                      } ${n.read ? "opacity-60" : ""}`}
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString("es-ES")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
