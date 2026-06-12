'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Plus,
  CalendarDays,
  User,
  Users,
  BedDouble,
  Hash,
  Globe,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, bookingSources, generateBookingCode } from '@/lib/utils';

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
}

interface RoomOption {
  id: string;
  number: string;
  roomType: { name: string; basePrice: number };
}

interface QuickBookingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillDate?: string;
  prefillRoomId?: string;
}

export default function QuickBookingPanel({
  isOpen,
  onClose,
  onCreated,
  prefillDate,
  prefillRoomId,
}: QuickBookingPanelProps) {
  const [guestQuery, setGuestQuery] = useState('');
  const [guestResults, setGuestResults] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showNewGuest, setShowNewGuest] = useState(false);
  const [newGuest, setNewGuest] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idNumber: '',
  });

  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState(prefillRoomId || '');
  const [checkIn, setCheckIn] = useState(prefillDate || '');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [source, setSource] = useState('direct');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (prefillDate) {
      setCheckIn(prefillDate);
      const d = new Date(prefillDate);
      d.setDate(d.getDate() + 1);
      setCheckOut(d.toISOString().split('T')[0]);
    }
  }, [prefillDate]);

  useEffect(() => {
    if (prefillRoomId) {
      setSelectedRoomId(prefillRoomId);
    }
  }, [prefillRoomId]);

  useEffect(() => {
    if (!guestQuery.trim() || selectedGuest) {
      setGuestResults([]);
      return;
    }
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      fetch(`/api/guests?search=${encodeURIComponent(guestQuery)}&limit=10`)
        .then((r) => r.json())
        .then((data) => setGuestResults(data.data || []))
        .catch(() => setGuestResults([]));
    }, 300);
    setSearchTimer(timer);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [guestQuery, selectedGuest, searchTimer]);

  const fetchAvailableRooms = useCallback(async () => {
    if (!checkIn || !checkOut) return;
    try {
      const res = await fetch('/api/rooms');
      const allRooms: RoomOption[] = await res.json();
      if (allRooms.length === 0) return;
      const ci = new Date(checkIn);
      const co = new Date(checkOut);
      const available = allRooms.filter((room) => {
        const bookings = (room as any).bookings || [];
        return !bookings.some((b: any) => {
          if (b.status === 'cancelled') return false;
          const bci = new Date(b.checkIn);
          const bco = new Date(b.checkOut);
          return ci < bco && co > bci;
        });
      });
      setRooms(available);
    } catch {
      setRooms([]);
    }
  }, [checkIn, checkOut]);

  useEffect(() => {
    fetchAvailableRooms();
  }, [fetchAvailableRooms]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const baseRate = selectedRoom?.roomType?.basePrice || 0;
  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
        )
      : 0;
  const occupancySurcharge = adults > 1 ? baseRate * 0.15 * (adults - 1) : 0;
  const effectiveRate = baseRate + occupancySurcharge;
  const subtotal = effectiveRate * nights;
  const total = Math.round(subtotal * 100) / 100;

  const resetForm = () => {
    setGuestQuery('');
    setGuestResults([]);
    setSelectedGuest(null);
    setShowNewGuest(false);
    setNewGuest({ firstName: '', lastName: '', email: '', phone: '', idNumber: '' });
    setSelectedRoomId(prefillRoomId || '');
    setCheckIn(prefillDate || '');
    setCheckOut('');
    setAdults(2);
    setChildren(0);
    setSource('direct');
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError('');

    let guestId = selectedGuest?.id;

    if (!guestId && showNewGuest) {
      if (!newGuest.firstName.trim() || !newGuest.lastName.trim()) {
        setError('Nombre y apellido del nuevo huésped son requeridos');
        return;
      }
      try {
        const res = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newGuest),
        });
        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Error al crear huésped');
          return;
        }
        const createdGuest = await res.json();
        guestId = createdGuest.id;
      } catch {
        setError('Error al crear huésped');
        return;
      }
    }

    if (!guestId) {
      setError('Selecciona un huésped existente o crea uno nuevo');
      return;
    }

    if (!checkIn || !checkOut) {
      setError('Fechas de check-in y check-out son requeridas');
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      setError('Check-out debe ser posterior a check-in');
      return;
    }
    if (!selectedRoomId) {
      setError('Selecciona una habitación');
      return;
    }
    if (adults < 1) {
      setError('Debe haber al menos 1 adulto');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          roomId: selectedRoomId,
          checkIn,
          checkOut,
          adults,
          children,
          roomRate: effectiveRate,
          totalNights: nights,
          totalAmount: total,
          paidAmount: 0,
          source,
          notes,
          status: 'confirmed',
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Error al crear reserva');
        setSubmitting(false);
        return;
      }
      resetForm();
      onCreated();
      onClose();
    } catch {
      setError('Error de conexión al crear reserva');
    }
    setSubmitting(false);
  };

  const selectGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setGuestQuery(`${guest.firstName} ${guest.lastName}`);
    setGuestResults([]);
    setShowNewGuest(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 transition-opacity" onClick={handleClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-[420px] max-w-full bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 overflow-y-auto transition-transform duration-300 translate-x-0">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            Nueva Reserva
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Huésped
            </label>
            {!selectedGuest || showNewGuest ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar huésped existente..."
                  value={guestQuery}
                  onChange={(e) => {
                    setGuestQuery(e.target.value);
                    setSelectedGuest(null);
                  }}
                  className="input pl-9"
                />
                {guestResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {guestResults.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => selectGuest(g)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">
                          {g.firstName} {g.lastName}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {g.email || g.phone || ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedGuest.firstName} {selectedGuest.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedGuest.email || selectedGuest.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuest(null);
                    setGuestQuery('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Cambiar
                </button>
              </div>
            )}
            {!selectedGuest && (
              <button
                type="button"
                onClick={() => setShowNewGuest(!showNewGuest)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-1"
              >
                <Plus className="h-3 w-3" />
                {showNewGuest ? 'Buscar existente' : 'Nuevo huésped'}
              </button>
            )}
            {showNewGuest && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={newGuest.firstName}
                  onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Apellido *"
                  value={newGuest.lastName}
                  onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                  className="input"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  className="input"
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  className="input"
                />
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Documento de identidad"
                    value={newGuest.idNumber}
                    onChange={(e) => setNewGuest({ ...newGuest, idNumber: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5" />
              Habitación
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="input"
            >
              <option value="">Seleccionar habitación...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.number} — {room.roomType.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                min={todayStr}
                onChange={(e) => setCheckIn(e.target.value)}
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || todayStr}
                onChange={(e) => setCheckOut(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Adultos
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={adults}
                onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Niños
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={children}
                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                className="input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Origen
            </label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="input">
              {bookingSources.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Total estimado
            </label>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Tarifa base</span>
                <span>{formatCurrency(baseRate)} / noche</span>
              </div>
              {occupancySurcharge > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Suplemento ({adults - 1} pers. extra)</span>
                  <span>{formatCurrency(occupancySurcharge)} / noche</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Noches</span>
                <span>{nights}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas opcionales..."
              rows={3}
              className="input resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 py-4 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creando...
              </>
            ) : (
              'Crear Reserva'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
