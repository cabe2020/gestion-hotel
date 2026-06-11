"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatCurrency, bookingStatuses } from "@/lib/utils";
import {
  ArrowLeft,
  Star,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  FileText,
  Clock,
  Tag,
  User,
} from "lucide-react";

interface GuestData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  nationality: string;
  address: string;
  notes: string;
  vip: boolean;
  dateOfBirth: string | null;
  tags: { id: string; tag: { id: string; name: string; color: string } }[];
}

interface BookingData {
  id: string;
  code: string;
  status: string;
  checkIn: string;
  checkOut: string;
  roomRate: number;
  totalNights: number;
  totalAmount: number;
  paidAmount: number;
  room: { number: string; roomType: { name: string } } | null;
  payments: PaymentData[];
  folioItems: FolioItemData[];
  createdAt: string;
}

interface PaymentData {
  id: string;
  amount: number;
  method: string;
  reference: string;
  createdAt: string;
  bookingCode?: string;
  bookingId?: string;
}

interface FolioItemData {
  id: string;
  concept: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
  bookingCode?: string;
  bookingId?: string;
}

interface AuditLogData {
  id: string;
  action: string;
  entity: string;
  details: string;
  createdAt: string;
  user: { id: string; name: string } | null;
}

interface TimelineData {
  bookings: BookingData[];
  payments: PaymentData[];
  folioItems: FolioItemData[];
  auditLogs: AuditLogData[];
}

const tagColorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  purple: "bg-purple-100 text-purple-800",
  pink: "bg-pink-100 text-pink-800",
  orange: "bg-orange-100 text-orange-800",
  gray: "bg-gray-100 text-gray-800",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
  refund: "Reembolso",
};

const folioCategoryLabels: Record<string, string> = {
  room: "Habitacion",
  minibar: "Minibar",
  restaurant: "Restaurante",
  spa: "Spa",
  laundry: "Lavanderia",
  parking: "Estacionamiento",
  other: "Otro",
};

export default function GuestTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stays" | "payments" | "charges" | "activity">("stays");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [guestRes, timelineRes] = await Promise.all([
        fetch(`/api/guests/${id}`),
        fetch(`/api/guests/${id}/timeline`),
      ]);
      if (guestRes.ok) setGuest(await guestRes.json());
      if (timelineRes.ok) setTimeline(await timelineRes.json());
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div>
        <Header />
        <div className="p-8 text-center text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div>
        <Header />
        <div className="p-8 text-center text-gray-500">Huesped no encontrado</div>
      </div>
    );
  }

  const totalSpent = (timeline?.payments || [])
    .filter((p) => p.amount > 0)
    .reduce((s, p) => s + p.amount, 0);
  const totalRefunds = (timeline?.payments || [])
    .filter((p) => p.amount < 0)
    .reduce((s, p) => s + Math.abs(p.amount), 0);
  const totalCharges = (timeline?.folioItems || []).reduce((s, f) => s + f.amount, 0);

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <button
          onClick={() => router.push("/guests")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Huespedes
        </button>

        <div className="card p-6">
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {guest.firstName} {guest.lastName}
                </h1>
                {guest.vip && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> VIP
                  </span>
                )}
                {(guest.tags || []).map((t) => (
                  <span
                    key={t.id}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${tagColorMap[t.tag?.color] || "bg-gray-100 text-gray-800"}`}
                  >
                    {t.tag?.name}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                {guest.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-gray-400" /> {guest.email}
                  </span>
                )}
                {guest.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-gray-400" /> {guest.phone}
                  </span>
                )}
                {guest.idNumber && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-gray-400" /> {guest.idNumber}
                  </span>
                )}
                {guest.nationality && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-gray-400" /> {guest.nationality}
                  </span>
                )}
                {guest.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-gray-400" /> {guest.address}
                  </span>
                )}
              </div>
              {guest.notes && (
                <p className="mt-2 text-sm text-gray-500 italic">{guest.notes}</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{timeline?.bookings.length || 0}</p>
              <p className="text-xs text-blue-600 font-medium">Reservas</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-green-600 font-medium">Total Pagado</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{formatCurrency(totalRefunds)}</p>
              <p className="text-xs text-red-600 font-medium">Reembolsos</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalCharges)}</p>
              <p className="text-xs text-purple-600 font-medium">Cargos</p>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-gray-200 flex">
            {[
              { key: "stays", label: "Estadias", icon: Clock, count: timeline?.bookings.length },
              { key: "payments", label: "Pagos", icon: CreditCard, count: timeline?.payments.length },
              { key: "charges", label: "Cargos", icon: FileText, count: timeline?.folioItems.length },
              { key: "activity", label: "Actividad", icon: Tag, count: timeline?.auditLogs.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "stays" && (
              <div className="space-y-4">
                {(!timeline?.bookings || timeline.bookings.length === 0) ? (
                  <p className="text-center text-gray-500 py-8">Sin estadias registradas</p>
                ) : (
                  timeline.bookings.map((booking, idx) => {
                    const status = bookingStatuses.find((s) => s.value === booking.status);
                    return (
                      <div key={booking.id} className="relative pl-8">
                        {idx < timeline.bookings.length - 1 && (
                          <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        <div className="absolute left-1 top-2 h-5 w-5 rounded-full bg-blue-500 border-2 border-white shadow-sm flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{booking.code}</span>
                              {status && <StatusBadge label={status.label} color={status.color} />}
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatDate(booking.createdAt)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Habitacion</p>
                              <p className="font-medium text-gray-800">
                                {booking.room ? `Hab. ${booking.room.number} - ${booking.room.roomType?.name}` : "Sin asignar"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Check-in / Check-out</p>
                              <p className="font-medium text-gray-800">
                                {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Noches</p>
                              <p className="font-medium text-gray-800">{booking.totalNights}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Total / Pagado</p>
                              <p className="font-medium text-gray-800">
                                {formatCurrency(booking.totalAmount)} / {formatCurrency(booking.paidAmount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-4">
                {(!timeline?.payments || timeline.payments.length === 0) ? (
                  <p className="text-center text-gray-500 py-8">Sin pagos registrados</p>
                ) : (
                  timeline.payments.map((payment, idx) => (
                    <div key={payment.id} className="relative pl-8">
                      {idx < timeline.payments.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className={`absolute left-1 top-2 h-5 w-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                        payment.amount >= 0 ? "bg-green-500" : "bg-red-500"
                      }`}>
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-bold ${payment.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                              {payment.amount >= 0 ? "+" : ""}{formatCurrency(payment.amount)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              {paymentMethodLabels[payment.method] || payment.method}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {payment.bookingCode && `Reserva ${payment.bookingCode}`}
                            {payment.reference && ` - Ref: ${payment.reference}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(payment.createdAt)}</p>
                        </div>
                        <CreditCard className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "charges" && (
              <div className="space-y-4">
                {(!timeline?.folioItems || timeline.folioItems.length === 0) ? (
                  <p className="text-center text-gray-500 py-8">Sin cargos registrados</p>
                ) : (
                  timeline.folioItems.map((item, idx) => (
                    <div key={item.id} className="relative pl-8">
                      {idx < timeline.folioItems.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className="absolute left-1 top-2 h-5 w-5 rounded-full bg-purple-500 border-2 border-white shadow-sm flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-purple-700">
                              {formatCurrency(item.amount)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              {folioCategoryLabels[item.category] || item.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{item.concept}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.bookingCode && `Reserva ${item.bookingCode} - `}
                            {formatDate(item.date)}
                          </p>
                        </div>
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-4">
                {(!timeline?.auditLogs || timeline.auditLogs.length === 0) ? (
                  <p className="text-center text-gray-500 py-8">Sin actividad registrada</p>
                ) : (
                  timeline.auditLogs.map((log, idx) => (
                    <div key={log.id} className="relative pl-8">
                      {idx < timeline.auditLogs.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className="absolute left-1 top-2 h-5 w-5 rounded-full bg-gray-400 border-2 border-white shadow-sm flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700 capitalize">
                            {log.action}
                          </span>
                          {log.user && (
                            <span className="text-xs text-gray-500">por {log.user.name}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{log.details}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
