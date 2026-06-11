"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Autocomplete from "@/components/Autocomplete";

type Hotel = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxRate: number;
};

type RoomTypeAvailability = {
  id: string;
  name: string;
  code: string;
  capacity: number;
  amenities: string;
  basePrice: number;
  pricePerNight: number;
  totalRooms: number;
  availableCount: number;
  ratePlanName: string | null;
};

type BookingResult = {
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
  specialRequests: string;
  guest: { firstName: string; lastName: string; email: string };
  room: { number: string; roomType: { name: string } } | null;
};

const STEPS = ["Fechas", "Habitacion", "Datos", "Confirmacion"];

export default function BookingEnginePage() {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [roomTypes, setRoomTypes] = useState<RoomTypeAvailability[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomTypeAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const [guestForm, setGuestForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idNumber: "",
    nationality: "",
    specialRequests: "",
  });

  useEffect(() => {
    fetch("/api/hotels")
      .then((r) => r.json())
      .then(setHotel)
      .catch(() => {});
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const nightCount =
    checkIn && checkOut
      ? Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const canProceedFromStep0 =
    checkIn && checkOut && nightCount > 0 && adults >= 1;

  async function searchAvailability() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/booking-engine/availability?checkIn=${checkIn}&checkOut=${checkOut}`
      );
      if (!res.ok) throw new Error("Error buscando disponibilidad");
      const data = await res.json();
      setRoomTypes(data);
      if (data.length === 0) {
        setError("No hay habitaciones disponibles para las fechas seleccionadas");
      }
      setStep(1);
    } catch {
      setError("Error al buscar disponibilidad. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function submitBooking() {
    if (!selectedRoomType || !hotel) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/booking-engine/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest: {
            firstName: guestForm.firstName,
            lastName: guestForm.lastName,
            email: guestForm.email,
            phone: guestForm.phone,
            idNumber: guestForm.idNumber,
            nationality: guestForm.nationality,
          },
          checkIn,
          checkOut,
          roomTypeId: selectedRoomType.id,
          adults,
          children,
          specialRequests: guestForm.specialRequests,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error creando reserva");
      }
      const booking = await res.json();
      setBookingResult(booking);
      setStep(3);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al procesar la reserva";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

	function parseAmenities(amenitiesStr: string): string[] {
		if (!amenitiesStr) return [];
		return amenitiesStr
			.split(",")
			.map((a) => a.trim())
			.filter(Boolean);
	}

	function getOccupancyRate(basePrice: number): number {
		if (adults <= 1) return basePrice;
		return basePrice * (1 + 0.15 * (adults - 1));
	}

	function getOccupancySurcharge(basePrice: number): number {
		if (adults <= 1) return 0;
		return basePrice * 0.15 * (adults - 1);
	}

  if (bookingResult && step === 3) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              G
            </div>
            <span className="text-xl font-bold text-gray-900">
              {hotel?.name || "Hosterix"}
            </span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="booking-engine-card max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Reserva Confirmada
            </h2>
            <p className="text-gray-500 mb-6">
              Su reserva ha sido procesada exitosamente
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-600 font-medium mb-1">
                Codigo de Reserva
              </p>
              <p className="text-3xl font-bold text-blue-900 tracking-wider">
                {bookingResult.code}
              </p>
            </div>
            <div className="space-y-3 text-left mb-6">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Huesped</span>
                <span className="font-medium text-gray-900">
                  {bookingResult.guest.firstName} {bookingResult.guest.lastName}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Check-in</span>
                <span className="font-medium text-gray-900">
                  {formatDate(bookingResult.checkIn)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Check-out</span>
                <span className="font-medium text-gray-900">
                  {formatDate(bookingResult.checkOut)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Habitacion</span>
                <span className="font-medium text-gray-900">
                  {bookingResult.room
                    ? `${bookingResult.room.number} - ${bookingResult.room.roomType.name}`
                    : "Por asignar"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Noches</span>
                <span className="font-medium text-gray-900">
                  {bookingResult.totalNights}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500 text-lg font-semibold">Total</span>
                <span className="font-bold text-gray-900 text-lg">
                  {formatCurrency(bookingResult.totalAmount, hotel?.currency || "USD")}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Se ha enviado un correo de confirmacion a {bookingResult.guest.email}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              G
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 block leading-tight">
                {hotel?.name || "Hosterix"}
              </span>
              {hotel?.address && (
                <span className="text-xs text-gray-400">{hotel.address}</span>
              )}
            </div>
          </div>
          {hotel?.phone && (
            <span className="text-sm text-gray-500 hidden sm:block">
              {hotel.phone}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-8 mt-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors ${
                      i < step
                        ? "booking-engine-step-completed"
                        : i === step
                        ? "booking-engine-step-active"
                        : "booking-engine-step-pending"
                    }`}
                  >
                    {i < step ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1 font-medium ${
                      i <= step ? "text-gray-700" : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-1 mb-5 transition-colors ${
                      i < step ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="max-w-md mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="booking-engine-card max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seleccione sus fechas
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Elija las fechas de su estadia y el numero de huespedes
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (checkOut && e.target.value >= checkOut) {
                        setCheckOut("");
                      }
                    }}
                    className="booking-engine-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out
                  </label>
                  <input
                    type="date"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="booking-engine-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adultos
                  </label>
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="booking-engine-input"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ninos
                  </label>
                  <select
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="booking-engine-input"
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {nightCount > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 mb-6 text-center">
                  <span className="text-blue-700 font-medium">
                    {nightCount} noche{nightCount > 1 ? "s" : ""} de estadia
                  </span>
                </div>
              )}
              <button
                onClick={searchAvailability}
                disabled={!canProceedFromStep0 || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                {loading ? "Buscando..." : "Buscar Disponibilidad"}
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Habitaciones Disponibles
                </h2>
                <button
                  onClick={() => {
                    setStep(0);
                    setSelectedRoomType(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Cambiar fechas
                </button>
              </div>
              <p className="text-gray-500 text-sm mb-6">
                {formatDate(checkIn)} - {formatDate(checkOut)} &middot; {nightCount}{" "}
                noche{nightCount > 1 ? "s" : ""}
              </p>
              {roomTypes.length === 0 ? (
                <div className="booking-engine-card text-center py-12">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0H3.75m1.5 0v-.375c0-.621.504-1.125 1.125-1.125h18.75c.621 0 1.125.504 1.125 1.125V3"
                    />
                  </svg>
                  <p className="text-gray-500">
                    No hay habitaciones disponibles para estas fechas
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
		{roomTypes.map((rt) => {
					const amenities = parseAmenities(rt.amenities);
					const isSelected = selectedRoomType?.id === rt.id;
					const displayRate = getOccupancyRate(rt.pricePerNight);
					const surcharge = getOccupancySurcharge(rt.pricePerNight);
					return (
						<div
							key={rt.id}
							className={`booking-engine-card cursor-pointer ${
								isSelected
									? "ring-2 ring-blue-600 shadow-blue-100"
									: ""
							}`}
							onClick={() => setSelectedRoomType(rt)}
						>
							<div className="flex flex-col sm:flex-row gap-4">
								<div className="w-full sm:w-40 h-32 sm:h-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
									<svg
										className="w-10 h-10 text-blue-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={1.5}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0H3.75m1.5 0v-.375c0-.621.504-1.125 1.125-1.125h18.75c.621 0 1.125.504 1.125 1.125V3"
										/>
									</svg>
								</div>
								<div className="flex-1">
									<div className="flex items-start justify-between mb-2">
										<div>
											<h3 className="text-lg font-bold text-gray-900">
												{rt.name}
											</h3>
											<div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
												<span className="flex items-center gap-1">
													<svg
														className="w-4 h-4"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														strokeWidth={2}
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
														/>
													</svg>
													{rt.capacity} personas
												</span>
												<span>{rt.availableCount} disponible{rt.availableCount > 1 ? "s" : ""}</span>
											</div>
										</div>
										<div className="text-right">
											<p className="text-2xl font-bold text-blue-600">
												{formatCurrency(displayRate, hotel?.currency || "USD")}
											</p>
											<p className="text-xs text-gray-400">por noche</p>
											{surcharge > 0 && (
												<p className="text-xs text-amber-600 mt-0.5">
													Incl. {formatCurrency(surcharge, hotel?.currency || "USD")} supl. {adults} pers.
												</p>
											)}
											{rt.ratePlanName && (
												<span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
													{rt.ratePlanName}
												</span>
											)}
										</div>
									</div>
                            {amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {amenities.map((a, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex justify-end">
                              <button
                                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                  isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                }`}
                              >
                                {isSelected ? "Seleccionada" : "Seleccionar"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="btn-secondary"
                >
                  Atras
                </button>
                <button
                  onClick={() => {
                    if (selectedRoomType) {
                      setError("");
                      setStep(2);
                    } else {
                      setError("Seleccione un tipo de habitacion");
                    }
                  }}
                  disabled={!selectedRoomType}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="booking-engine-card max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Sus Datos
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Ingrese sus datos personales para completar la reserva
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={guestForm.firstName}
                      onChange={(e) =>
                        setGuestForm({ ...guestForm, firstName: e.target.value })
                      }
                      className="booking-engine-input"
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido *
                    </label>
                    <input
                      type="text"
                      value={guestForm.lastName}
                      onChange={(e) =>
                        setGuestForm({ ...guestForm, lastName: e.target.value })
                      }
                      className="booking-engine-input"
                      placeholder="Perez"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={guestForm.email}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, email: e.target.value })
                    }
                    className="booking-engine-input"
                    placeholder="juan@email.com"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono *
                    </label>
                    <input
                      type="tel"
                      value={guestForm.phone}
                      onChange={(e) =>
                        setGuestForm({ ...guestForm, phone: e.target.value })
                      }
                      className="booking-engine-input"
                      placeholder="+52 555 123 4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numero de Identidad *
                    </label>
                    <input
                      type="text"
                      value={guestForm.idNumber}
                      onChange={(e) =>
                        setGuestForm({ ...guestForm, idNumber: e.target.value })
                      }
                      className="booking-engine-input"
                      placeholder="Pasaporte o ID"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nacionalidad
                  </label>
                  <Autocomplete
                    endpoint="/api/guests/search"
                    labelKey="nationality"
                    valueKey="nationality"
                    placeholder="Ej: Mexicana"
                    value={guestForm.nationality}
                    displayValue={guestForm.nationality}
onSelect={(item) => {
          if (item && item.nationality) setGuestForm({ ...guestForm, nationality: String(item.nationality) });
        }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peticiones Especiales
                  </label>
                  <textarea
                    value={guestForm.specialRequests}
                    onChange={(e) =>
                      setGuestForm({
                        ...guestForm,
                        specialRequests: e.target.value,
                      })
                    }
                    className="booking-engine-input min-h-[80px] resize-y"
                    placeholder="Habitacion en piso alto, cuna para bebe, etc."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary"
                >
                  Atras
                </button>
                <button
                  onClick={() => {
                    if (
                      !guestForm.firstName ||
                      !guestForm.lastName ||
                      !guestForm.email ||
                      !guestForm.phone ||
                      !guestForm.idNumber
                    ) {
                      setError("Complete todos los campos obligatorios (*)");
                      return;
                    }
                    setError("");
                    setStep(3);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                  Ver Resumen
                </button>
              </div>
            </div>
          )}

          {step === 3 && !bookingResult && selectedRoomType && (
            <div className="booking-engine-card max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Resumen de Reserva
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Verifique los datos antes de confirmar
              </p>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Fechas</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Check-in</span>
                    <span className="font-medium">{formatDate(checkIn)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Check-out</span>
                    <span className="font-medium">{formatDate(checkOut)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Noches</span>
                    <span className="font-medium">{nightCount}</span>
                  </div>
                </div>

			<div className="bg-gray-50 rounded-xl p-4">
					<h4 className="font-semibold text-gray-900 mb-2">
						Habitacion
					</h4>
					<p className="font-medium text-gray-900">
						{selectedRoomType.name}
					</p>
					<p className="text-sm text-gray-500 mt-1">
						{formatCurrency(getOccupancyRate(selectedRoomType.pricePerNight), hotel?.currency || "USD")}{" "}
						por noche
						{selectedRoomType.ratePlanName &&
							` (${selectedRoomType.ratePlanName})`}
					</p>
					{getOccupancySurcharge(selectedRoomType.pricePerNight) > 0 && (
						<p className="text-xs text-amber-600 mt-1">
							Tarifa base: {formatCurrency(selectedRoomType.pricePerNight, hotel?.currency || "USD")} + Suplemento {adults - 1} persona{adults - 1 > 1 ? "s" : ""}: {formatCurrency(getOccupancySurcharge(selectedRoomType.pricePerNight), hotel?.currency || "USD")}/noche
						</p>
					)}
					<div className="flex gap-4 mt-2 text-sm">
						<span className="text-gray-500">
							{adults} adulto{adults > 1 ? "s" : ""}
						</span>
						{children > 0 && (
							<span className="text-gray-500">
								{children} nino{children > 1 ? "s" : ""}
							</span>
						)}
					</div>
				</div>

				<div className="bg-gray-50 rounded-xl p-4">
					<h4 className="font-semibold text-gray-900 mb-2">Huesped</h4>
					<p className="font-medium text-gray-900">
						{guestForm.firstName} {guestForm.lastName}
					</p>
					<p className="text-sm text-gray-500 mt-1">
						{guestForm.email}
					</p>
					<p className="text-sm text-gray-500">{guestForm.phone}</p>
					{guestForm.nationality && (
						<p className="text-sm text-gray-500">
							{guestForm.nationality}
						</p>
					)}
					{guestForm.specialRequests && (
						<p className="text-sm text-gray-400 mt-2 italic">
							&ldquo;{guestForm.specialRequests}&rdquo;
						</p>
					)}
				</div>

				<div className="bg-blue-50 rounded-xl p-4">
					{(() => {
						const occRate = getOccupancyRate(selectedRoomType.pricePerNight);
						const occSurcharge = getOccupancySurcharge(selectedRoomType.pricePerNight);
						return (
							<>
								{occSurcharge > 0 && (
									<>
										<div className="flex justify-between items-center mb-1 text-sm">
											<span className="text-gray-500">Tarifa base x {nightCount} noche{nightCount > 1 ? "s" : ""}</span>
											<span className="text-gray-700">
												{formatCurrency(selectedRoomType.pricePerNight * nightCount, hotel?.currency || "USD")}
											</span>
										</div>
										<div className="flex justify-between items-center mb-2 text-sm">
											<span className="text-gray-500">Suplemento {adults - 1} persona{adults - 1 > 1 ? "s" : ""} x {nightCount} noche{nightCount > 1 ? "s" : ""}</span>
											<span className="text-amber-700">
												+{formatCurrency(occSurcharge * nightCount, hotel?.currency || "USD")}
											</span>
										</div>
									</>
								)}
								{!occSurcharge && (
									<div className="flex justify-between items-center mb-2">
										<span className="text-gray-600">
											{selectedRoomType.pricePerNight.toFixed(2)} x {nightCount}{" "}
											noche{nightCount > 1 ? "s" : ""}
										</span>
										<span className="font-medium text-gray-900">
											{formatCurrency(
												selectedRoomType.pricePerNight * nightCount,
												hotel?.currency || "USD"
											)}
										</span>
									</div>
								)}
								{(hotel?.taxRate ?? 0) > 0 && (
									<div className="flex justify-between items-center mb-2 text-sm">
										<span className="text-gray-500">
											Impuestos ({hotel?.taxRate}%)
										</span>
										<span className="text-gray-700">
											{formatCurrency(
												occRate * nightCount * ((hotel?.taxRate ?? 0) / 100),
												hotel?.currency || "USD"
											)}
										</span>
									</div>
								)}
								<div className="border-t border-blue-200 pt-2 mt-2 flex justify-between items-center">
									<span className="text-lg font-bold text-gray-900">Total</span>
									<span className="text-lg font-bold text-blue-600">
										{formatCurrency(
											occRate * nightCount * (1 + (hotel?.taxRate ?? 0) / 100),
											hotel?.currency || "USD"
										)}
									</span>
								</div>
							</>
						);
					})()}
				</div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="btn-secondary"
                >
                  Atras
                </button>
                <button
                  onClick={submitBooking}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-colors"
                >
                  {submitting ? "Procesando..." : "Confirmar Reserva"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white/60 border-t border-gray-100 px-4 py-3 text-center">
        <p className="text-xs text-gray-400">
          {hotel?.name || "Hosterix"} &middot; Reservas Online
        </p>
      </footer>
    </div>
  );
}
