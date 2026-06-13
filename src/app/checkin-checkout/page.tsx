'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { LogIn, LogOut, CreditCard, Receipt, Check, DollarSign, X, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate, paymentMethods } from '@/lib/utils';

interface Booking {
  id: string;
  code: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number;
  paidAmount: number;
  guest: { id: string; firstName: string; lastName: string; idNumber?: string };
  room: { id: string; number: string; roomType: { name: string } };
  payments?: { amount: number; method: string; createdAt: string }[];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function CheckInCheckOutPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [folioBooking, setFolioBooking] = useState<Booking | null>(null);
  const [folioItems, setFolioItems] = useState<{ description: string; amount: number }[]>([]);
  const [folioLoading, setFolioLoading] = useState(false);
  const [action, setAction] = useState<'checkin' | 'checkout' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : (data.data ?? []));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayStr();
  const arrivals = bookings.filter((b) => {
    const ci = new Date(b.checkIn).toISOString().split('T')[0];
    return ci === today && b.status === 'confirmed';
  });
  const checkedIn = bookings.filter((b) => b.status === 'checked-in');
  const departures = checkedIn.filter((b) => {
    const co = new Date(b.checkOut).toISOString().split('T')[0];
    return co === today;
  });
  const lateDepartures = checkedIn.filter((b) => {
    const co = new Date(b.checkOut).toISOString().split('T')[0];
    return co < today;
  });

  const openFolio = async (booking: Booking, act: 'checkin' | 'checkout') => {
    setFolioBooking(booking);
    setAction(act);
    setPaymentMethod('cash');
    setPaymentAmount(booking.totalAmount - booking.paidAmount);
    setPaymentReference('');
    setMessage(null);

    setFolioLoading(true);
    setFolioItems([]);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/folio-items`);
      if (res.ok) {
        const data = await res.json();
        setFolioItems(Array.isArray(data) ? data : (data.data ?? []));
      }
    } catch {
      // ignore, show just payment info
    } finally {
      setFolioLoading(false);
    }
  };

  const closeFolio = () => {
    setFolioBooking(null);
    setAction(null);
  };

  const handleProcess = async () => {
    if (!folioBooking || !action) return;
    setProcessing(true);
    setMessage(null);

    try {
      const isCheckout = action === 'checkout';
      const pending = folioBooking.totalAmount - folioBooking.paidAmount;
      const payAmount = isCheckout ? pending : Number(paymentAmount) || 0;

      if (payAmount > 0) {
        const payRes = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: folioBooking.id,
            amount: payAmount,
            method: paymentMethod,
            reference: paymentReference || undefined,
          }),
        });
        if (!payRes.ok) throw new Error('Error al procesar pago');
      }

      if (isCheckout) {
        const invRes = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: folioBooking.id,
            total: folioBooking.totalAmount,
            taxAmount: 0,
          }),
        });
        if (!invRes.ok) throw new Error('Error al crear factura');
      }

      const newStatus = isCheckout ? 'checked-out' : 'checked-in';
      const statusRes = await fetch(`/api/bookings/${folioBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!statusRes.ok) throw new Error('Error al actualizar reserva');

      setMessage({
        type: 'success',
        text: isCheckout ? 'Check-out completado con éxito' : 'Check-in completado con éxito',
      });
      setTimeout(() => {
        closeFolio();
        load();
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar';
      setMessage({ type: 'error', text: message });
    } finally {
      setProcessing(false);
    }
  };

  const BookingCard = ({
    booking,
    type,
    urgent,
  }: {
    booking: Booking;
    type: 'arrival' | 'departure';
    urgent?: boolean;
  }) => {
    const pending = booking.totalAmount - booking.paidAmount;
    return (
      <div className={`card ${urgent ? 'border-red-200' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-mono font-medium text-blue-600">{booking.code}</span>
          {type === 'arrival' ? (
            <StatusBadge label="Por llegar" color="bg-blue-100 text-blue-800" />
          ) : urgent ? (
            <StatusBadge label="Atrasado" color="bg-red-100 text-red-800" />
          ) : (
            <StatusBadge label="Check-out hoy" color="bg-orange-100 text-orange-800" />
          )}
        </div>
        <div className="space-y-1 mb-4">
          <p className="text-lg font-semibold text-gray-900">
            {booking.guest?.firstName} {booking.guest?.lastName}
          </p>
          {booking.guest?.idNumber && (
            <p className="text-sm text-gray-500">Doc: {booking.guest.idNumber}</p>
          )}
          <p className="text-sm text-gray-700">
            Hab. {booking.room?.number} - {booking.room?.roomType?.name}
          </p>
          <p className="text-sm text-gray-500">
            {booking.adults} adultos, {booking.children} niños
          </p>
          <p className="text-sm text-gray-500">
            {type === 'arrival'
              ? `Check-out: ${formatDate(booking.checkOut)}`
              : `Check-in: ${formatDate(booking.checkIn)}`}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-gray-600">
              Total: {formatCurrency(booking.totalAmount)}
            </span>
            <span className="text-sm text-gray-600">
              Pagado: {formatCurrency(booking.paidAmount)}
            </span>
            {pending > 0 && (
              <span className="text-sm font-medium text-red-600">
                Pendiente: {formatCurrency(pending)}
              </span>
            )}
            {pending <= 0 && (
              <span className="text-sm font-medium text-green-600">Pagado completo</span>
            )}
          </div>
        </div>
        <button
          onClick={() => openFolio(booking, type === 'arrival' ? 'checkin' : 'checkout')}
          className={`w-full justify-center ${type === 'arrival' ? 'btn-success' : 'btn-primary'}`}
        >
          {type === 'arrival' ? (
            <>
              <LogIn className="h-4 w-4" /> Realizar Check-in
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" /> Realizar Check-out
            </>
          )}
        </button>
      </div>
    );
  };

  const pendingBalance = folioBooking ? folioBooking.totalAmount - folioBooking.paidAmount : 0;
  const allPaid = pendingBalance <= 0;

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LogIn className="h-6 w-6 text-blue-600" />
            Check-in / Check-out
          </h1>
          <span className="text-sm text-gray-500">{formatDate(new Date())}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Arrivals */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <LogIn className="h-5 w-5 text-blue-600" />
                Llegadas de Hoy
              </h2>
              {arrivals.length === 0 ? (
                <div className="card text-center py-8">
                  <LogIn className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No hay llegadas programadas para hoy</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {arrivals.map((b) => (
                    <BookingCard key={b.id} booking={b} type="arrival" />
                  ))}
                </div>
              )}
            </div>

            {/* Late departures */}
            {lateDepartures.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-red-600" />
                  Check-outs Atrasados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lateDepartures.map((b) => (
                    <BookingCard key={b.id} booking={b} type="departure" urgent />
                  ))}
                </div>
              </div>
            )}

            {/* Departures */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <LogOut className="h-5 w-5 text-orange-600" />
                Salidas de Hoy
              </h2>
              {departures.length === 0 ? (
                <div className="card text-center py-8">
                  <LogOut className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No hay salidas programadas para hoy</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departures.map((b) => (
                    <BookingCard key={b.id} booking={b} type="departure" />
                  ))}
                </div>
              )}
            </div>

            {/* Currently checked-in */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Huéspedes Actualmente</h2>
              {checkedIn.length === 0 ? (
                <p className="text-sm text-gray-500">No hay huéspedes en el hotel</p>
              ) : (
                <div className="space-y-2">
                  {checkedIn.map((b) => {
                    const co = new Date(b.checkOut).toISOString().split('T')[0];
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          co <= today ? 'bg-red-50' : 'bg-blue-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {b.guest?.firstName} {b.guest?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Hab. {b.room?.number} - Salida: {formatDate(b.checkOut)}
                          </p>
                        </div>
                        <button
                          onClick={() => openFolio(b, 'checkout')}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          Check-out
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Folio Modal */}
      <Modal
        isOpen={!!folioBooking}
        onClose={closeFolio}
        title={
          folioBooking
            ? `${action === 'checkin' ? 'Check-in' : 'Check-out'} - ${folioBooking.guest?.firstName} ${folioBooking.guest?.lastName}`
            : ''
        }
        size="lg"
      >
        {folioBooking && (
          <div className="space-y-5">
            {/* Booking info */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="font-mono font-medium text-blue-600">{folioBooking.code}</span>
              <span>
                Hab. {folioBooking.room?.number} - {folioBooking.room?.roomType?.name}
              </span>
            </div>

            {/* Folio items */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-gray-500" />
                Folio / Cargos
              </h3>
              {folioLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando folio...
                </div>
              ) : folioItems.length > 0 ? (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {folioItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-gray-700">{item.description}</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No hay cargos adicionales registrados</p>
              )}
            </div>

            {/* Financial summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total reserva</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(folioBooking.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pagado</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(folioBooking.paidAmount)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  {allPaid ? 'Saldo' : 'Pendiente'}
                </span>
                <span
                  className={`font-bold text-base ${allPaid ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(pendingBalance)}
                </span>
              </div>
            </div>

            {/* Payment form (only if there's a pending balance or it's checkout with details) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-gray-500" />
                {allPaid && action === 'checkin'
                  ? 'Pago completo — solo procesar check-in'
                  : 'Procesar pago'}
              </h3>
              {!allPaid && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Método de pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="input w-full"
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm.value} value={pm.value}>
                          {pm.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="input w-full pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Referencia <span className="text-gray-400">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Nro. de transacción, voucher, etc."
                      className="input w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            {message && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <X className="h-4 w-4 shrink-0" />
                )}
                {message.text}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleProcess}
              disabled={processing}
              className="btn-primary w-full justify-center"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
                </>
              ) : action === 'checkin' ? (
                <>
                  <LogIn className="h-4 w-4" /> Procesar Check-in
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" /> Procesar Check-out
                </>
              )}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
