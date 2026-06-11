"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Hotel,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Phone,
  MapPin,
  DollarSign,
  ChevronLeft,
  Check,
  Building2,
} from "lucide-react";
import Link from "next/link";

const CURRENCIES = [
  { value: "USD", label: "USD - Dólar americano", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "MXN", label: "MXN - Peso mexicano", symbol: "$" },
  { value: "COP", label: "COP - Peso colombiano", symbol: "$" },
  { value: "ARS", label: "ARS - Peso argentino", symbol: "$" },
  { value: "CLP", label: "CLP - Peso chileno", symbol: "$" },
  { value: "PEN", label: "PEN - Sol peruano", symbol: "S/." },
  { value: "BRL", label: "BRL - Real brasileño", symbol: "R$" },
  { value: "DOP", label: "DOP - Peso dominicano", symbol: "RD$" },
  { value: "GTQ", label: "GTQ - Quetzal guatemalteco", symbol: "Q" },
  { value: "HNL", label: "HNL - Lempira hondureño", symbol: "L" },
  { value: "NIO", label: "NIO - Córdoba nicaragüense", symbol: "C$" },
  { value: "PAB", label: "PAB - Balboa panameño", symbol: "B/." },
  { value: "PYG", label: "PYG - Guaraní paraguayo", symbol: "₲" },
  { value: "UYU", label: "UYU - Peso uruguayo", symbol: "$U" },
  { value: "VES", label: "VES - Bolívar venezolano", symbol: "Bs." },
  { value: "CRC", label: "CRC - Colón costarricense", symbol: "₡" },
  { value: "SVC", label: "SVC - Colón salvadoreño", symbol: "¢" },
];

type Step = 1 | 2 | 3;

export default function SignUpPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [hotelForm, setHotelForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    currency: "USD",
  });

  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const updateHotel = (key: string, value: string) =>
    setHotelForm((p) => ({ ...p, [key]: value }));

  const updateAdmin = (key: string, value: string) =>
    setAdminForm((p) => ({ ...p, [key]: value }));

  const validateStep1 = () => {
    if (!hotelForm.name.trim()) {
      setError("El nombre del hotel es requerido");
      return false;
    }
    if (hotelForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hotelForm.email)) {
      setError("El email del hotel no es válido");
      return false;
    }
    setError("");
    return true;
  };

  const validateStep2 = () => {
    if (!adminForm.name.trim()) {
      setError("Tu nombre es requerido");
      return false;
    }
    if (!adminForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) {
      setError("Ingresa un email válido");
      return false;
    }
    if (adminForm.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (adminForm.password !== adminForm.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return false;
    }
    setError("");
    return true;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel: {
            name: hotelForm.name,
            address: hotelForm.address,
            phone: hotelForm.phone,
            email: hotelForm.email,
            currency: hotelForm.currency,
          },
          user: {
            name: adminForm.name,
            email: adminForm.email,
            password: adminForm.password,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error?.[0]?.message ||
            data.error ||
            "Error al crear la cuenta"
        );
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: adminForm.email,
        password: adminForm.password,
        redirect: false,
      });

      if (result?.error) {
        setStep(1);
        setError("Cuenta creada. Inicia sesión manualmente.");
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const stepTitles = [
    { n: 1, label: "Tu Hotel" },
    { n: 2, label: "Tu Cuenta" },
    { n: 3, label: "Confirmar" },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-32 left-16 w-80 h-80 bg-indigo-400 rounded-full blur-3xl" />
          <div className="absolute bottom-16 right-16 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative z-10 flex flex-col justify-between px-14 py-12 w-full">
          <div className="flex items-center gap-3">
            <img src="/logos/logo-final.svg" alt="Hosterix" className="h-12 w-auto" />
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Comienza a gestionar
              <br />
              tu hotel hoy
            </h2>
            <p className="text-blue-200 text-lg leading-relaxed max-w-md">
              Crea tu cuenta en minutos y accede a todas las herramientas que necesitas para administrar tu hotel.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Calendario de reservas visual e intuitivo",
                "Gestión de habitaciones y huéspedes",
                "Control de caja y facturación",
                "Reportes de ocupación e ingresos",
                "Multi-usuario con roles de acceso",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-blue-200 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-blue-300/60">
            &copy; {new Date().getFullYear()} Hosterix &middot; Sistema de
            Gestión Hotelera
          </p>
        </div>
      </div>

      <div className="w-full lg:w-[55%] flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-lg">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <img src="/logos/logo-final.svg" alt="Hosterix" className="h-10 w-auto" />
            </div>

            <div className="mb-6">
              <Link
                href="/auth/signin"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>

              <h1 className="text-2xl font-bold text-gray-900">
                Crear mi cuenta de hotel
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Configura tu hotel y tu cuenta de administrador
              </p>
            </div>

            <div className="flex items-center gap-2 mb-8">
              {stepTitles.map((s, i) => (
                <div key={s.n} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        step >= s.n
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {step > s.n ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        s.n
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        step >= s.n ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < stepTitles.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 rounded-full ${
                        step > s.n ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6 flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nombre del hotel <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={hotelForm.name}
                      onChange={(e) => updateHotel("name", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Hotel Paraíso"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dirección
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={hotelForm.address}
                      onChange={(e) => updateHotel("address", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Av. Principal 123, Ciudad"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={hotelForm.phone}
                        onChange={(e) => updateHotel("phone", e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="+52 555 123 4567"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email del hotel
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={hotelForm.email}
                        onChange={(e) => updateHotel("email", e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="info@hotel.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Moneda
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={hotelForm.currency}
                      onChange={(e) => updateHotel("currency", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-2">
                  <p className="text-xs text-blue-700 font-medium">
                    Cuenta de administrador
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Esta será tu cuenta principal con acceso completo al sistema. Podrás crear usuarios adicionales después.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tu nombre completo <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={adminForm.name}
                      onChange={(e) => updateAdmin("name", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="María García"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tu email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => updateAdmin("email", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="maria@hotel.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contraseña <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={adminForm.password}
                      onChange={(e) => updateAdmin("password", e.target.value)}
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {adminForm.password && (
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            adminForm.password.length >= i * 3
                              ? adminForm.password.length >= 12
                                ? "bg-emerald-500"
                                : adminForm.password.length >= 8
                                ? "bg-amber-500"
                                : "bg-red-400"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirmar contraseña <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={adminForm.confirmPassword}
                      onChange={(e) =>
                        updateAdmin("confirmPassword", e.target.value)
                      }
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                        adminForm.confirmPassword &&
                        adminForm.password !== adminForm.confirmPassword
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-200"
                      }`}
                      placeholder="Repite tu contraseña"
                      required
                    />
                  </div>
                  {adminForm.confirmPassword &&
                    adminForm.password !== adminForm.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">
                        Las contraseñas no coinciden
                      </p>
                    )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                    className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Datos del hotel
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Nombre</p>
                      <p className="font-medium text-gray-900">{hotelForm.name}</p>
                    </div>
                    {hotelForm.address && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Dirección</p>
                        <p className="font-medium text-gray-900">{hotelForm.address}</p>
                      </div>
                    )}
                    {hotelForm.phone && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Teléfono</p>
                        <p className="font-medium text-gray-900">{hotelForm.phone}</p>
                      </div>
                    )}
                    {hotelForm.email && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Email</p>
                        <p className="font-medium text-gray-900">{hotelForm.email}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Moneda</p>
                      <p className="font-medium text-gray-900">
                        {CURRENCIES.find((c) => c.value === hotelForm.currency)?.label}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Cuenta de administrador
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Nombre</p>
                      <p className="font-medium text-gray-900">{adminForm.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Email</p>
                      <p className="font-medium text-gray-900">{adminForm.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Rol</p>
                      <p className="font-medium text-gray-900">Administrador</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs text-amber-800">
                    Al crear tu cuenta, podrás configurar tipos de habitación, agregar más usuarios y personalizar tu hotel desde la sección de Configuración.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(2);
                      setError("");
                    }}
                    className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Crear Cuenta
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
