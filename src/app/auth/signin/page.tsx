'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Hotel,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  ChevronLeft,
  Shield,
  CalendarDays,
  BarChart3,
  Bed,
} from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{
    tempPassword?: string;
    error?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Email o contraseña incorrectos');
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotResult(null);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setForgotResult({ tempPassword: data.tempPassword });
    } else {
      setForgotResult({
        error: data.error?.[0]?.message || data.error || 'Error',
      });
    }
    setForgotLoading(false);
  };

  const features = [
    {
      icon: CalendarDays,
      title: 'Calendario visual',
      desc: 'Gestiona reservas con vista tipo timeline',
    },
    {
      icon: Bed,
      title: 'Control de habitaciones',
      desc: 'Estados, tipos y disponibilidad en tiempo real',
    },
    {
      icon: BarChart3,
      title: 'Reportes y caja',
      desc: 'Ingresos, gastos y ocupación al instante',
    },
    {
      icon: Shield,
      title: 'Multi-rol y seguro',
      desc: 'Admin y recepcionistas con permisos diferenciados',
    },
  ];

  if (showForgot) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col justify-center px-16 text-white">
            <div className="flex items-center gap-3 mb-8">
              <img src="/logos/logo-final.svg" alt="Hosterix" className="h-12 w-auto" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Recupera tu acceso</h2>
            <p className="text-blue-200 text-lg leading-relaxed max-w-md">
              Genera una contraseña temporal para volver a entrar. Luego podrás cambiarla desde tu
              perfil.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
          <div className="w-full max-w-md">
            <button
              onClick={() => {
                setShowForgot(false);
                setForgotResult(null);
                setForgotEmail('');
              }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver al inicio de sesión
            </button>

            <div className="mb-8">
              <div className="inline-flex items-center justify-center h-14 w-14 bg-amber-100 rounded-2xl mb-4">
                <KeyRound className="h-7 w-7 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h1>
              <p className="text-gray-500 mt-2">
                Ingresa tu email y te generaremos una contraseña temporal
              </p>
            </div>

            {forgotResult?.tempPassword && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 mb-6 space-y-2">
                <p className="text-sm font-medium">Contraseña temporal generada:</p>
                <p className="font-mono text-2xl tracking-widest font-bold bg-emerald-100 rounded-lg px-4 py-2 text-center select-all">
                  {forgotResult.tempPassword}
                </p>
                <p className="text-xs text-emerald-600">
                  Úsala para iniciar sesión y luego cámbiala.
                </p>
              </div>
            )}

            {forgotResult?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6">
                {forgotResult.error}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow"
                    placeholder="tu@hotel.com"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {forgotLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Generar Contraseña
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-400 rounded-full blur-3xl" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between px-16 py-12 w-full">
          <div className="flex items-center gap-3">
            <img src="/logos/logo-final.svg" alt="Hosterix" className="h-12 w-auto" />
          </div>

          <div className="space-y-10">
            <div>
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                Gestiona tu hotel
                <br />
                de forma inteligente
              </h2>
              <p className="text-blue-200 text-lg leading-relaxed max-w-lg">
                Reservas, habitaciones, huéspedes, caja y reportes. Todo en un solo lugar, accesible
                desde cualquier dispositivo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <f.icon className="h-5 w-5 text-blue-300 mb-2" />
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-blue-300 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-blue-300/60">
            &copy; {new Date().getFullYear()} Hosterix &middot; Sistema de Gestión Hotelera
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/logos/logo-final.svg" alt="Hosterix" className="h-10 w-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
            <p className="text-gray-500 mt-2">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow"
                  placeholder="tu@hotel.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">Recordarme</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Olvidé mi contraseña
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              ¿No tienes una cuenta?{' '}
              <Link
                href="/auth/signup"
                className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                Crear mi hotel
              </Link>
            </p>
          </div>

          <div className="mt-6 bg-gray-100 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Acceso demo
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                <span className="font-mono text-gray-700">admin@hotel.com</span>
              </span>
              <span className="text-gray-300">/</span>
              <span>
                <span className="font-mono text-gray-700">admin123</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
