'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { LogOut, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Booking {
  id: string;
  code: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paidAmount: number;
  guest: { firstName: string; lastName: string };
  room: { number: string; roomType: { name: string } };
  payments: { amount: number; method: string; createdAt: string }[];
}

export default function CheckOutPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const load = () =>
    fetch('/api/bookings')
      .then((r) => r.json())
      .then((res) => setBookings(Array.isArray(res) ? res : res.data));

  useEffect(() => {
    load();
  }, []);

  const checkedIn = bookings.filter((b) => b.status === 'checked-in');
  const today = new Date().toISOString().split('T')[0];
  const todayCheckouts = checkedIn.filter((b) => {
    const co = new Date(b.checkOut).toISOString().split('T')[0];
    return co === today;
  });
  const lateCheckouts = checkedIn.filter((b) => {
    const co = new Date(b.checkOut).toISOString().split('T')[0];
    return co < today;
  });

  const handleCheckOut = async (id: string) => {
    await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'checked-out' }),
    });
    load();
  };

  const CheckoutCard = ({ booking, urgent }: { booking: Booking; urgent?: boolean }) => {
    const pending = booking.totalAmount - booking.paidAmount;
    return (
      <div className={`card ${urgent ? 'border-red-200' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-mono font-medium text-blue-600">{booking.code}</span>
          {urgent && <StatusBadge label="Atrasado" color="bg-red-100 text-red-800" />}
        </div>
        <div className="space-y-1 mb-4">
          <p className="text-lg font-semibold text-gray-900">
            {booking.guest?.firstName} {booking.guest?.lastName}
          </p>
          <p className="text-sm text-gray-700">
            Hab. {booking.room?.number} - {booking.room?.roomType?.name}
          </p>
          <p className="text-sm text-gray-500">Check-out: {formatDate(booking.checkOut)}</p>
          <div className="flex items-center gap-2 mt-2">
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
          onClick={() => handleCheckOut(booking.id)}
          className="btn-primary w-full justify-center"
        >
          <Check className="h-4 w-4" />
          Realizar Check-out
        </button>
      </div>
    );
  };

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LogOut className="h-6 w-6 text-orange-600" />
            Check-out
          </h1>
          <span className="text-sm text-gray-500">{formatDate(new Date())}</span>
        </div>

        {lateCheckouts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-red-600 mb-3">Check-outs Atrasados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lateCheckouts.map((b) => (
                <CheckoutCard key={b.id} booking={b} urgent />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Check-outs de Hoy</h2>
          {todayCheckouts.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No hay check-outs programados para hoy</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayCheckouts.map((b) => (
                <CheckoutCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Todos los Huéspedes Actualmente
          </h2>
          <div className="space-y-2">
            {checkedIn.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
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
                  onClick={() => handleCheckOut(b.id)}
                  className="btn-primary text-xs py-1 px-3"
                >
                  Check-out
                </button>
              </div>
            ))}
            {checkedIn.length === 0 && (
              <p className="text-sm text-gray-500">No hay huéspedes en el hotel</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
