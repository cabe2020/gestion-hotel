"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";

interface BookingInfo {
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
  digitalCheckInDone: boolean;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    idNumber: string;
    nationality: string;
  };
  room: {
    number: string;
    roomType: { name: string; capacity: number };
  } | null;
}

const STEPS = ["Buscar Reserva", "Detalles", "Check-in Digital", "Firma", "Confirmacion"];

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Cargando...</p></div>}>
      <PortalContent />
    </Suspense>
  );
}

function PortalContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    idNumber: "",
    emergencyContact: "",
    emergencyPhone: "",
    specialRequests: "",
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (code) {
      handleSearch();
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!code.trim()) {
      setError("Ingrese un codigo de reserva");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal?code=${encodeURIComponent(code.trim())}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Reserva no encontrada");
      }
      const data = await res.json();
      setBooking(data);
      setForm(f => ({
        ...f,
        idNumber: data.guest.idNumber || "",
      }));
      if (data.digitalCheckInDone) {
        setStep(4);
        setSuccess(true);
      } else {
        setStep(1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al buscar reserva";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasSignature(false);
  };

  useEffect(() => {
    if (step === 3) {
      setTimeout(initCanvas, 100);
    }
  }, [step]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    initCanvas();
  };

  const handleSubmit = async () => {
    if (!booking || !hasSignature) return;
    setLoading(true);
    setError("");
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas?.toDataURL("image/png") || "";

      const res = await fetch("/api/portal/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: booking.code,
          idNumber: form.idNumber,
          emergencyContact: form.emergencyContact,
          emergencyPhone: form.emergencyPhone,
          specialRequests: form.specialRequests,
          signature: signatureData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al procesar check-in");
      }

      setSuccess(true);
      setStep(4);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al procesar check-in";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            G
          </div>
          <span className="text-xl font-bold text-gray-900">Check-in Digital</span>
        </div>
      </header>

      <main className="flex-1 p-4 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-center mb-6 mt-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-colors ${
                      i < step
                        ? "border-green-500 bg-green-500 text-white"
                        : i === step
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {i < step ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium max-w-[60px] text-center ${i <= step ? "text-gray-700" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 sm:w-10 h-0.5 mx-1 mb-5 transition-colors ${i < step ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="portal-card">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Buscar su Reserva</h2>
              <p className="text-gray-500 text-sm mb-6">
                Ingrese el codigo de su reserva para comenzar el check-in digital
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codigo de Reserva
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="portal-input"
                  placeholder="BK-XXXXXX"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !code.trim()}
                className="portal-btn-primary"
              >
                {loading ? "Buscando..." : "Buscar Reserva"}
              </button>
            </div>
          )}

          {step === 1 && booking && (
            <div className="portal-card">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Detalles de su Reserva</h2>
              <p className="text-gray-500 text-sm mb-4">
                Verifique que los datos sean correctos
              </p>

              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-600 font-medium">Codigo de Reserva</p>
                <p className="text-2xl font-bold text-blue-900 tracking-wider">{booking.code}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Huesped</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {booking.guest.firstName} {booking.guest.lastName}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Check-in</span>
                  <span className="font-medium text-gray-900 text-sm">{formatDate(booking.checkIn)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Check-out</span>
                  <span className="font-medium text-gray-900 text-sm">{formatDate(booking.checkOut)}</span>
                </div>
                {booking.room && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Habitacion</span>
                    <span className="font-medium text-gray-900 text-sm">
                      Hab. {booking.room.number} - {booking.room.roomType.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Huespedes</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {booking.adults} adulto{booking.adults > 1 ? "s" : ""}
                    {booking.children > 0 ? `, ${booking.children} niño${booking.children > 1 ? "s" : ""}` : ""}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Noches</span>
                  <span className="font-medium text-gray-900 text-sm">{booking.totalNights}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 text-sm font-semibold">Total</span>
                  <span className="font-bold text-gray-900 text-sm">{formatCurrency(booking.totalAmount)}</span>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="portal-btn-primary"
              >
                Continuar con Check-in Digital
              </button>
            </div>
          )}

          {step === 2 && booking && (
            <div className="portal-card">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Check-in Digital</h2>
              <p className="text-gray-500 text-sm mb-4">
                Complete sus datos para el check-in
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {booking.guest.firstName} {booking.guest.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{booking.guest.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numero de Identidad / Pasaporte *
                  </label>
                  <input
                    type="text"
                    value={form.idNumber}
                    onChange={(e) => setForm(f => ({ ...f, idNumber: e.target.value }))}
                    className="portal-input"
                    placeholder="Documento de identidad"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contacto de Emergencia *
                    </label>
                    <input
                      type="text"
                      value={form.emergencyContact}
                      onChange={(e) => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
                      className="portal-input"
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono de Emergencia *
                    </label>
                    <input
                      type="tel"
                      value={form.emergencyPhone}
                      onChange={(e) => setForm(f => ({ ...f, emergencyPhone: e.target.value }))}
                      className="portal-input"
                      placeholder="+00 000 000 0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peticiones Especiales
                  </label>
                  <textarea
                    value={form.specialRequests}
                    onChange={(e) => setForm(f => ({ ...f, specialRequests: e.target.value }))}
                    className="portal-input min-h-[80px] resize-y"
                    placeholder="Habitacion en piso alto, cuna para bebe, etc."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="portal-btn-secondary">
                  Atras
                </button>
                <button
                  onClick={() => {
                    if (!form.idNumber || !form.emergencyContact || !form.emergencyPhone) {
                      setError("Complete todos los campos obligatorios (*)");
                      return;
                    }
                    setError("");
                    setStep(3);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 3 && booking && (
            <div className="portal-card">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Firma Digital</h2>
              <p className="text-gray-500 text-sm mb-4">
                Firme en el area abaixo para confirmar su check-in
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                <p><span className="text-gray-500">Huesped:</span> <span className="font-medium">{booking.guest.firstName} {booking.guest.lastName}</span></p>
                <p><span className="text-gray-500">Documento:</span> <span className="font-medium">{form.idNumber}</span></p>
                <p><span className="text-gray-500">Contacto emergencia:</span> <span className="font-medium">{form.emergencyContact} - {form.emergencyPhone}</span></p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firme aqui *
                </label>
                <canvas
                  ref={canvasRef}
                  className="signature-canvas"
                  style={{ height: "160px" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-400">Use el dedo o el mouse para firmar</p>
                  <button
                    onClick={clearSignature}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Limpiar firma
                  </button>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} className="portal-btn-secondary">
                  Atras
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !hasSignature}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                  {loading ? "Procesando..." : "Confirmar Check-in"}
                </button>
              </div>
            </div>
          )}

          {step === 4 && booking && (
            <div className="portal-card text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					{success ? "Check-in Digital Completado" : "Check-in Digital Ya Realizado"}
				</h2>
				<p className="text-gray-500 mb-6">
					{success
						? "Su check-in digital ha sido procesado exitosamente."
						: "Ya ha completado el check-in digital para esta reserva."
					}
				</p>
				<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-center">
					<p className="text-sm font-semibold text-amber-800">
						Presentar este codigo en recepcion
					</p>
				</div>
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-600 font-medium mb-1">Codigo de Reserva</p>
                <p className="text-3xl font-bold text-blue-900 tracking-wider">{booking.code}</p>
              </div>
              <div className="space-y-2 text-left text-sm mb-6">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Huesped</span>
                  <span className="font-medium">{booking.guest.firstName} {booking.guest.lastName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Check-in</span>
                  <span className="font-medium">{formatDate(booking.checkIn)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Check-out</span>
                  <span className="font-medium">{formatDate(booking.checkOut)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white/60 border-t border-gray-100 px-4 py-3 text-center">
        <p className="text-xs text-gray-400">Hosterix &middot; Check-in Digital</p>
      </footer>
    </div>
  );
}
