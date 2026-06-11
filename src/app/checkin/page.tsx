"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { LogIn, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

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
  guest: { id: string; firstName: string; lastName: string; idNumber: string };
  room: { id: string; number: string; roomType: { name: string } };
}

export default function CheckInPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const load = () => fetch("/api/bookings").then(r => r.json()).then(res => setBookings(Array.isArray(res) ? res : res.data));

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayCheckins = bookings.filter(b => {
    const ci = new Date(b.checkIn).toISOString().split("T")[0];
    return ci === today && b.status === "confirmed";
  });

  const handleCheckIn = async (id: string) => {
    await fetch(`/api/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "checked-in" })
    });
    load();
  };

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LogIn className="h-6 w-6 text-blue-600" />
            Check-in
          </h1>
          <span className="text-sm text-gray-500">{formatDate(new Date())}</span>
        </div>

        {todayCheckins.length === 0 ? (
          <div className="card text-center py-12">
            <LogIn className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay check-ins pendientes para hoy</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayCheckins.map(booking => (
              <div key={booking.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono font-medium text-blue-600">{booking.code}</span>
                  <StatusBadge label="Confirmada" color="bg-blue-100 text-blue-800" />
                </div>
                <div className="space-y-1 mb-4">
                  <p className="text-lg font-semibold text-gray-900">{booking.guest?.firstName} {booking.guest?.lastName}</p>
                  <p className="text-sm text-gray-500">Doc: {booking.guest?.idNumber || "-"}</p>
                  <p className="text-sm text-gray-700">Hab. {booking.room?.number} - {booking.room?.roomType?.name}</p>
                  <p className="text-sm text-gray-500">{booking.adults} adultos, {booking.children} niños</p>
                  <p className="text-sm text-gray-500">Check-out: {formatDate(booking.checkOut)}</p>
                  <p className="text-sm font-medium text-gray-900">Total: ${booking.totalAmount}</p>
                </div>
                <button
                  onClick={() => handleCheckIn(booking.id)}
                  className="btn-success w-full justify-center"
                >
                  <Check className="h-4 w-4" />
                  Realizar Check-in
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ya con Check-in hoy</h2>
          <div className="space-y-2">
            {bookings.filter(b => b.status === "checked-in").map(booking => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{booking.guest?.firstName} {booking.guest?.lastName}</p>
                  <p className="text-xs text-gray-500">Hab. {booking.room?.number} - {booking.code}</p>
                </div>
                <StatusBadge label="Check-in realizado" color="bg-green-100 text-green-800" />
              </div>
            ))}
            {bookings.filter(b => b.status === "checked-in").length === 0 && (
              <p className="text-sm text-gray-500">Ningún huésped ha hecho check-in aún</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
