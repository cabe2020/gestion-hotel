"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Hotel } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{ tempPassword?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Credenciales incorrectas");
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotResult(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setForgotResult({ tempPassword: data.tempPassword });
    } else {
      setForgotResult({ error: data.error?.[0]?.message || data.error || "Error" });
    }
    setForgotLoading(false);
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-600 rounded-2xl mb-4">
              <Hotel className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h1>
            <p className="text-gray-500 mt-1">Ingresa tu email para obtener una contraseña temporal</p>
          </div>

          {forgotResult?.tempPassword && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3 mb-4 space-y-1">
              <p className="font-medium">Contraseña temporal generada:</p>
              <p className="font-mono text-lg tracking-wider">{forgotResult.tempPassword}</p>
              <p className="text-xs text-green-600">Úsala para iniciar sesión y luego cámbiala.</p>
            </div>
          )}

          {forgotResult?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {forgotResult.error}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="input-field"
                placeholder="admin@hotel.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={forgotLoading}
              className="btn-primary w-full justify-center py-3"
            >
              {forgotLoading ? "Generando..." : "Generar Contraseña Temporal"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setShowForgot(false); setForgotResult(null); setForgotEmail(""); }}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Volver a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-600 rounded-2xl mb-4">
            <Hotel className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GestHotel</h1>
          <p className="text-gray-500 mt-1">Sistema de Gestión Hotelera</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="admin@hotel.com"
              required
            />
          </div>
          <div>
            <label className="label-field">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setShowForgot(true)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Olvidé mi contraseña
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Demo: admin@hotel.com / admin123</p>
        </div>
      </div>
    </div>
  );
}
