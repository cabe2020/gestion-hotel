"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import { Plus, Eye, DollarSign, Pencil, CalendarPlus, ArrowRightLeft, ShoppingCart, UserX, Ban } from "lucide-react";
import { formatCurrency, formatDate, bookingStatuses, bookingSources } from "@/lib/utils";
import ExportButton from "@/components/ExportButton";
import { useToast } from "@/components/Toast";
import { registerShortcutAction } from "@/components/KeyboardShortcuts";
import Autocomplete from "@/components/Autocomplete";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
}

interface RoomWith {
  id: string;
  number: string;
  roomType: { name: string; basePrice: number };
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
}

interface Booking {
  id: string;
  code: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomRate: number;
  totalNights: number;
  totalAmount: number;
  paidAmount: number;
  notes: string;
  source: string;
  specialRequests: string;
  guest: Guest;
  room: RoomWith;
  payments: Payment[];
}

interface GuestOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface RoomOption {
  id: string;
  number: string;
  roomType: { name: string; basePrice: number };
  status: string;
}

interface UpsellItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  active: boolean;
}

interface FolioItemData {
  id: string;
  concept: string;
  amount: number;
  category: string;
  date: string;
}

export default function BookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const [form, setForm] = useState({
    guestId: "",
    roomId: "",
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    source: "direct",
    notes: "",
  });
  const [editForm, setEditForm] = useState({
    guestId: "",
    roomId: "",
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    source: "direct",
    notes: "",
    specialRequests: "",
  });
  const [upgradeRoomId, setUpgradeRoomId] = useState("");
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: "cash", reference: "" });
  const [showUpsells, setShowUpsells] = useState(false);
  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([]);
  const [bookingFolioItems, setBookingFolioItems] = useState<FolioItemData[]>([]);

  const load = useCallback(() => {
    fetch(`/api/bookings?page=${currentPage}&limit=${limit}`).then(r => r.json()).then(res => {
      setBookings(res.data);
      setTotalBookings(res.total);
      setTotalPages(res.totalPages);
    });
    fetch("/api/guests").then(r => r.json()).then(res => {
      setGuests(Array.isArray(res) ? res : res.data);
    });
    fetch("/api/rooms").then(r => r.json()).then(setRooms);
  }, [currentPage]);

  useEffect(() => { load(); }, [load]);

  const calcNights = (ci: string, co: string) =>
    Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));

  const calcOccupancyRate = (basePrice: number, adults: number) => {
    if (adults <= 1) return basePrice;
    return basePrice * (1 + 0.15 * (adults - 1));
  };

  const calcOccupancySurcharge = (basePrice: number, adults: number) => {
    if (adults <= 1) return 0;
    return basePrice * 0.15 * (adults - 1);
  };

  const toDateString = (d: string | Date) => {
    const date = new Date(d);
    return date.toISOString().split("T")[0];
  };

  const addDay = (d: string | Date) => {
    const date = new Date(d);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find(r => r.id === form.roomId);
    const nights = calcNights(form.checkIn, form.checkOut);
    const baseRate = room?.roomType.basePrice || 0;
    const effectiveRate = calcOccupancyRate(baseRate, form.adults);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, roomRate: effectiveRate, totalNights: nights, totalAmount: effectiveRate * nights }),
    });
    if (res.ok) {
      toast.success("Reserva creada correctamente");
    } else {
      toast.error("Error al crear reserva");
    }
    setShowModal(false);
    setForm({ guestId: "", roomId: "", checkIn: "", checkOut: "", adults: 1, children: 0, source: "direct", notes: "" });
    load();
  };

  useEffect(() => {
    registerShortcutAction("newBooking", () => {
      setForm(f => ({ ...f, guestId: guests[0]?.id || "", roomId: rooms.filter(r => r.status === "available")[0]?.id || "" }));
      setShowModal(true);
    });
    return () => registerShortcutAction("newBooking", null);
  }, [guests, rooms]);

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    load();
  };

const handleNoShow = async (id: string) => {
  if (!(await toast.confirm("Marcar esta reserva como No-show?"))) return;
  await fetch(`/api/bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "no-show" }),
  });
  toast.info("Reserva marcada como No-show");
  load();
};

const handleCancel = async (id: string) => {
  if (!(await toast.confirm("Cancelar esta reserva?"))) return;
  await fetch(`/api/bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  toast.warning("Reserva cancelada");
  load();
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: selectedBooking.id, ...paymentForm }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Error al registrar pago");
      return;
    }
    toast.success("Pago registrado correctamente");
    setShowPayment(false);
    setPaymentForm({ amount: 0, method: "cash", reference: "" });
    load();
  };

  const openEdit = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditForm({
      guestId: booking.guest?.id || "",
      roomId: booking.room?.id || "",
      checkIn: toDateString(booking.checkIn),
      checkOut: toDateString(booking.checkOut),
      adults: booking.adults,
      children: booking.children,
      source: booking.source,
      notes: booking.notes || "",
      specialRequests: booking.specialRequests || "",
    });
    setShowEdit(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    const room = rooms.find(r => r.id === editForm.roomId);
    const nights = calcNights(editForm.checkIn, editForm.checkOut);
    const baseRate = room?.roomType.basePrice || selectedBooking.roomRate;
    const effectiveRate = calcOccupancyRate(baseRate, editForm.adults);
    await fetch(`/api/bookings/${selectedBooking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        roomRate: effectiveRate,
        totalNights: nights,
        totalAmount: effectiveRate * nights,
      }),
    });
    setShowEdit(false);
    load();
  };

  const handleExtendStay = async (booking: Booking) => {
    const newCheckOut = addDay(booking.checkOut);
    const room = rooms.find(r => r.id === booking.room?.id);
    const rate = room?.roomType.basePrice || booking.roomRate;
    const newTotalNights = booking.totalNights + 1;
    await fetch(`/api/bookings/${booking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkOut: newCheckOut,
        totalNights: newTotalNights,
        totalAmount: rate * newTotalNights,
      }),
    });
    load();
  };

  const openUpgrade = (booking: Booking) => {
    setSelectedBooking(booking);
    setUpgradeRoomId("");
    setShowUpgrade(true);
  };

  const openUpsells = async (booking: Booking) => {
    setSelectedBooking(booking);
    try {
      const [upsellsRes, folioRes] = await Promise.all([
        fetch("/api/upsells"),
        fetch(`/api/folio-items?bookingId=${booking.id}`),
      ]);
      const upsellsData = await upsellsRes.json();
      const folioData = await folioRes.json();
      setUpsellItems(upsellsData.filter((u: UpsellItem) => u.active));
      setBookingFolioItems(Array.isArray(folioData) ? folioData : []);
    } catch {
      setUpsellItems([]);
      setBookingFolioItems([]);
    }
    setShowUpsells(true);
  };

  const handleAddUpsell = async (upsell: UpsellItem) => {
    if (!selectedBooking) return;
    await fetch("/api/booking-upsells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: selectedBooking.id,
        upsellName: upsell.name,
        price: upsell.price,
        category: upsell.category,
      }),
    });
    load();
    openUpsells({ ...selectedBooking, totalAmount: selectedBooking.totalAmount + upsell.price });
  };

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !upgradeRoomId) return;
    const room = rooms.find(r => r.id === upgradeRoomId);
    const rate = room?.roomType.basePrice || selectedBooking.roomRate;
    await fetch(`/api/bookings/${selectedBooking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: upgradeRoomId,
        roomRate: rate,
        totalAmount: rate * selectedBooking.totalNights,
      }),
    });
    setShowUpgrade(false);
    load();
  };

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
  const availableRooms = rooms.filter(r => r.status === "available");
  const editAvailableRooms = rooms.filter(r => r.status === "available" || (selectedBooking && r.id === selectedBooking.room?.id));
  const upgradeAvailableRooms = rooms.filter(r => r.status === "available" && (!selectedBooking || r.id !== selectedBooking.room?.id));

  const editNights = editForm.checkIn && editForm.checkOut ? calcNights(editForm.checkIn, editForm.checkOut) : 0;
  const editRoom = rooms.find(r => r.id === editForm.roomId);
  const editBaseRate = editRoom?.roomType.basePrice || selectedBooking?.roomRate || 0;
  const editRate = calcOccupancyRate(editBaseRate, editForm.adults);
  const editSurcharge = calcOccupancySurcharge(editBaseRate, editForm.adults);

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <div className="flex items-center gap-2">
            <ExportButton entity="bookings" />
            <button
              onClick={() => {
                setForm(f => ({ ...f, guestId: guests[0]?.id || "", roomId: availableRooms[0]?.id || "" }));
                setShowModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> Nueva Reserva
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === "all" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Todas ({bookings.length})
          </button>
          {bookingStatuses.map(s => {
            const count = bookings.filter(b => b.status === s.value).length;
            return (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s.value ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Huésped</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Habitación</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Check-in</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Check-out</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pagado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(booking => {
                  const status = bookingStatuses.find(s => s.value === booking.status);
                  const pending = booking.totalAmount - booking.paidAmount;
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600">{booking.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{booking.guest?.firstName} {booking.guest?.lastName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{booking.room?.number} ({booking.room?.roomType?.name})</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(booking.checkIn)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(booking.checkOut)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(booking.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={pending > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                          {formatCurrency(booking.paidAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {status && <StatusBadge label={status.label} color={status.color} />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(booking)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowPayment(true);
                              setPaymentForm(pf => ({ ...pf, amount: pending }));
                            }}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600"
                            title="Cobrar"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                          {booking.status === "checked-in" && (
                            <button
                              onClick={() => handleExtendStay(booking)}
                              className="p-1.5 rounded hover:bg-purple-50 text-purple-600"
                              title="Extender Estadía"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </button>
                          )}
{["confirmed", "checked-in"].includes(booking.status) && (
          <button
            onClick={() => openUpgrade(booking)}
            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600"
            title="Cambiar Habitación"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
        )}
        {["confirmed", "checked-in"].includes(booking.status) && (
          <button
            onClick={() => openUpsells(booking)}
            className="p-1.5 rounded hover:bg-amber-50 text-amber-600"
            title="Upsells"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        )}
                          {booking.status === "confirmed" && (
                            <button
                              onClick={() => handleStatusChange(booking.id, "checked-in")}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                              title="Check-in"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                      {booking.status === "checked-in" && (
                        <button
                          onClick={() => handleStatusChange(booking.id, "checked-out")}
                          className="p-1.5 rounded hover:bg-orange-50 text-orange-600"
                          title="Check-out"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {booking.status === "confirmed" && new Date(booking.checkIn) < new Date(new Date().toISOString().split("T")[0]) && (
                        <button
                          onClick={() => handleNoShow(booking.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                          title="No-show"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                      {booking.status === "confirmed" && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                          title="Cancelar"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No hay reservas</p>}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalBookings}
            itemsPerPage={limit}
            onPageChange={setCurrentPage}
          />
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Reserva" size="lg">
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Huésped</label>
            <Autocomplete
              endpoint="/api/guests/search"
              labelKey="name"
              valueKey="id"
              placeholder="Buscar huesped..."
              value={form.guestId}
              displayValue={form.guestId ? guests.find(g => g.id === form.guestId)?.firstName + " " + guests.find(g => g.id === form.guestId)?.lastName || "" : ""}
onSelect={(item) => {
          if (item && item.id) setForm(f => ({ ...f, guestId: item.id as string }));
        }}
              onCreateNew={() => {
                window.open("/guests", "_blank");
              }}
            />
          </div>
              <div>
                <label className="label-field">Habitación</label>
                <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))} className="input-field" required>
                  <option value="">Seleccionar</option>
                  {availableRooms.map(r => <option key={r.id} value={r.id}>Hab. {r.number} - {r.roomType.name} (${r.roomType.basePrice}/noche)</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Check-in</label>
                <input type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="label-field">Check-out</label>
                <input type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} className="input-field" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label-field">Adultos</label>
                <input type="number" min={1} value={form.adults} onChange={e => setForm(f => ({ ...f, adults: parseInt(e.target.value) || 1 }))} className="input-field" />
              </div>
              <div>
                <label className="label-field">Niños</label>
                <input type="number" min={0} value={form.children} onChange={e => setForm(f => ({ ...f, children: parseInt(e.target.value) || 0 }))} className="input-field" />
              </div>
              <div>
                <label className="label-field">Origen</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="input-field">
                  {bookingSources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
<div>
        <label className="label-field">Notas</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={3} />
      </div>
      {form.adults > 1 && form.roomId && (() => {
        const room = rooms.find(r => r.id === form.roomId);
        if (!room) return null;
        const base = room.roomType.basePrice;
        const surcharge = calcOccupancySurcharge(base, form.adults);
        const total = calcOccupancyRate(base, form.adults);
        return (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-sm text-amber-800">Tarifa base: {formatCurrency(base)}/noche</p>
            <p className="text-sm text-amber-800">+ Suplemento {form.adults - 1} persona{form.adults - 1 > 1 ? "s" : ""}: {formatCurrency(surcharge)}/noche</p>
            <p className="text-sm font-medium text-amber-900">= {formatCurrency(total)}/noche</p>
          </div>
        );
      })()}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">Crear Reserva</button>
        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
      </div>
          </form>
        </Modal>

        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Editar Reserva - ${selectedBooking?.code || ""}`} size="lg">
    <form onSubmit={handleEditSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Huésped</label>
            <Autocomplete
              endpoint="/api/guests/search"
              labelKey="name"
              valueKey="id"
              placeholder="Buscar huesped..."
              value={editForm.guestId}
              displayValue={editForm.guestId ? guests.find(g => g.id === editForm.guestId)?.firstName + " " + guests.find(g => g.id === editForm.guestId)?.lastName || "" : ""}
onSelect={(item) => {
          if (item && item.id) setEditForm(f => ({ ...f, guestId: item.id as string }));
        }}
            />
          </div>
              <div>
                <label className="label-field">Habitación</label>
                <select value={editForm.roomId} onChange={e => setEditForm(f => ({ ...f, roomId: e.target.value }))} className="input-field" required>
                  <option value="">Seleccionar</option>
                  {editAvailableRooms.map(r => <option key={r.id} value={r.id}>Hab. {r.number} - {r.roomType.name} (${r.roomType.basePrice}/noche)</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Check-in</label>
                <input type="date" value={editForm.checkIn} onChange={e => setEditForm(f => ({ ...f, checkIn: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="label-field">Check-out</label>
                <input type="date" value={editForm.checkOut} onChange={e => setEditForm(f => ({ ...f, checkOut: e.target.value }))} className="input-field" required />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Noches: <span className="font-medium text-gray-900">{editNights}</span></p>
              {editForm.adults > 1 && editSurcharge > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mt-1">Tarifa base: <span className="font-medium text-gray-900">{formatCurrency(editBaseRate)}/noche</span></p>
                  <p className="text-sm text-amber-700 mt-1">+ Suplemento {editForm.adults - 1} persona{editForm.adults - 1 > 1 ? "s" : ""}: <span className="font-medium">{formatCurrency(editSurcharge)}/noche</span></p>
                  <p className="text-sm text-gray-600 mt-1">Tarifa con ocupacion: <span className="font-medium text-gray-900">{formatCurrency(editRate)}/noche</span></p>
                </>
              ) : (
                <p className="text-sm text-gray-600 mt-1">Tarifa: <span className="font-medium text-gray-900">{formatCurrency(editRate)}/noche</span></p>
              )}
              <p className="text-sm text-gray-600 mt-1">Total: <span className="font-medium text-gray-900">{formatCurrency(editRate * editNights)}</span></p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label-field">Adultos</label>
                <input type="number" min={1} value={editForm.adults} onChange={e => setEditForm(f => ({ ...f, adults: parseInt(e.target.value) || 1 }))} className="input-field" />
              </div>
              <div>
                <label className="label-field">Niños</label>
                <input type="number" min={0} value={editForm.children} onChange={e => setEditForm(f => ({ ...f, children: parseInt(e.target.value) || 0 }))} className="input-field" />
              </div>
              <div>
                <label className="label-field">Origen</label>
                <select value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} className="input-field">
                  {bookingSources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label-field">Notas</label>
              <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={3} />
            </div>
            <div>
              <label className="label-field">Peticiones Especiales</label>
              <textarea value={editForm.specialRequests} onChange={e => setEditForm(f => ({ ...f, specialRequests: e.target.value }))} className="input-field" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">Guardar Cambios</button>
              <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} title={`Cambiar Habitación - ${selectedBooking?.code || ""}`}>
          {selectedBooking && (
            <form onSubmit={handleUpgradeSubmit} className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Habitación actual: <span className="font-medium text-gray-900">Hab. {selectedBooking.room?.number} ({selectedBooking.room?.roomType?.name})</span></p>
                <p className="text-sm text-gray-600 mt-1">Tarifa actual: <span className="font-medium text-gray-900">{formatCurrency(selectedBooking.roomRate)}/noche</span></p>
              </div>
              <div>
                <label className="label-field">Nueva Habitación</label>
                <select value={upgradeRoomId} onChange={e => setUpgradeRoomId(e.target.value)} className="input-field" required>
                  <option value="">Seleccionar</option>
                  {upgradeAvailableRooms.map(r => <option key={r.id} value={r.id}>Hab. {r.number} - {r.roomType.name} (${r.roomType.basePrice}/noche)</option>)}
                </select>
              </div>
              {upgradeRoomId && (() => {
                const newRoom = rooms.find(r => r.id === upgradeRoomId);
                const newRate = newRoom?.roomType.basePrice || 0;
                return (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-800">Nueva tarifa: <span className="font-medium">{formatCurrency(newRate)}/noche</span></p>
                    <p className="text-sm text-blue-800 mt-1">Nuevo total: <span className="font-medium">{formatCurrency(newRate * selectedBooking.totalNights)}</span></p>
                  </div>
                );
              })()}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={!upgradeRoomId}>Cambiar Habitación</button>
                <button type="button" onClick={() => setShowUpgrade(false)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </form>
          )}
        </Modal>

<Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title={`Cobrar - ${selectedBooking?.code || ""}`}>
      {selectedBooking && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Huésped: <span className="font-medium text-gray-900">{selectedBooking.guest?.firstName} {selectedBooking.guest?.lastName}</span></p>
            <p className="text-sm text-gray-600 mt-1">Total: <span className="font-medium text-gray-900">{formatCurrency(selectedBooking.totalAmount)}</span></p>
            <p className="text-sm text-gray-600 mt-1">Pagado: <span className="font-medium text-green-600">{formatCurrency(selectedBooking.paidAmount)}</span></p>
            <p className="text-sm text-gray-600 mt-1">Pendiente: <span className="font-medium text-red-600">{formatCurrency(selectedBooking.totalAmount - selectedBooking.paidAmount)}</span></p>
          </div>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="label-field">Monto</label>
              <input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className="input-field" required />
            </div>
            <div>
              <label className="label-field">Método de Pago</label>
              <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} className="input-field">
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="label-field">Referencia</label>
              <input type="text" value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} className="input-field" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-success flex-1">Registrar Pago</button>
              <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </Modal>

    <Modal isOpen={showUpsells} onClose={() => setShowUpsells(false)} title={`Upsells - ${selectedBooking?.code || ""}`} size="lg">
      {selectedBooking && (
        <div className="space-y-4">
          {bookingFolioItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Cargos en el Folio</h3>
              <div className="space-y-1">
                {bookingFolioItems.map((fi) => (
                  <div key={fi.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-700">{fi.concept}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(fi.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Servicios Adicionales Disponibles</h3>
            {upsellItems.length === 0 ? (
              <p className="text-sm text-gray-500">No hay upsells disponibles</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {upsellItems.map((upsell) => (
                  <button
                    key={upsell.id}
                    onClick={() => handleAddUpsell(upsell)}
                    className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{upsell.name}</p>
                      {upsell.description && (
                        <p className="text-xs text-gray-500 truncate">{upsell.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-amber-700 ml-2 whitespace-nowrap">
                      +{formatCurrency(upsell.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowUpsells(false)} className="btn-secondary flex-1">Cerrar</button>
          </div>
        </div>
      )}
    </Modal>
      </div>
    </div>
  );
}
