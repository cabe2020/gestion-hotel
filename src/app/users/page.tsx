"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import { Plus, Edit2, UserCog, ToggleLeft, ToggleRight, KeyRound } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  receptionist: "bg-blue-100 text-blue-800",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  receptionist: "Recepcionista",
};

type Filter = "all" | "admin" | "receptionist" | "active" | "inactive";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Admin" },
  { value: "receptionist", label: "Recepcionista" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetResult, setResetResult] = useState<{ tempPassword?: string; error?: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "receptionist",
    active: true,
  });
  const [formError, setFormError] = useState("");

  const load = () => fetch("/api/users").then(r => r.json()).then(setUsers);

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (editingUser) {
      const updateData = { name: form.name, email: form.email, role: form.role, active: form.active };
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "",
          "x-user-role": "admin",
        },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.[0]?.message || data.error || "Error al actualizar");
        return;
      }
    } else {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.[0]?.message || data.error || "Error al crear");
        return;
      }
    }

    setShowModal(false);
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", role: "receptionist", active: true });
    load();
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: user.active,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleToggleActive = async (user: User) => {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "",
        "x-user-role": "admin",
      },
      body: JSON.stringify({ active: !user.active }),
    });
    load();
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Desactivar este usuario?")) return;
    await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: { "x-user-id": "", "x-user-role": "admin" },
    });
    load();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetResult(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetResult({ tempPassword: data.tempPassword });
    } else {
      setResetResult({ error: data.error?.[0]?.message || data.error || "Error" });
    }
    setResetLoading(false);
  };

  const openNewUser = () => {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", role: "receptionist", active: true });
    setFormError("");
    setShowModal(true);
  };

  const filtered = users.filter(u => {
    if (filter === "admin") return u.role === "admin";
    if (filter === "receptionist") return u.role === "receptionist";
    if (filter === "active") return u.active;
    if (filter === "inactive") return !u.active;
    return true;
  });

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { setResetEmail(""); setResetResult(null); setShowResetModal(true); }} className="btn-secondary">
              <KeyRound className="h-4 w-4" /> Resetear Contraseña
            </button>
            <button onClick={openNewUser} className="btn-primary">
              <Plus className="h-4 w-4" /> Nuevo Usuario
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Creado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[user.role] || "bg-gray-100 text-gray-800"}`}>
                      {roleLabel[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        user.active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                    >
                      {user.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {user.active ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(user)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {user.active && (
                        <button onClick={() => handleDeactivate(user.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Desactivar">
                          <UserCog className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No hay usuarios</p>}
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            {!editingUser && (
              <div>
                <label className="label-field">Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field"
                  required
                  minLength={6}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="input-field"
                >
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {editingUser && (
                <div>
                  <label className="label-field">Estado</label>
                  <select
                    value={form.active ? "true" : "false"}
                    onChange={e => setForm(f => ({ ...f, active: e.target.value === "true" }))}
                    className="input-field"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              )}
            </div>
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {typeof formError === "string" ? formError : JSON.stringify(formError)}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingUser ? "Guardar" : "Crear"}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          title="Resetear Contraseña"
          size="sm"
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="label-field">Email del usuario</label>
              <input
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                className="input-field"
                required
                placeholder="usuario@hotel.com"
              />
            </div>
            {resetResult?.tempPassword && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3 space-y-1">
                <p className="font-medium">Contraseña temporal generada:</p>
                <p className="font-mono text-lg tracking-wider">{resetResult.tempPassword}</p>
                <p className="text-xs text-green-600">Comuníquela al usuario para que pueda iniciar sesión.</p>
              </div>
            )}
            {resetResult?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {resetResult.error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={resetLoading} className="btn-primary flex-1">
                {resetLoading ? "Generando..." : "Generar Contraseña Temporal"}
              </button>
              <button type="button" onClick={() => setShowResetModal(false)} className="btn-secondary flex-1">
                Cerrar
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
