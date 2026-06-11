"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import { formatDate } from "@/lib/utils";
import { Shield, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
  user: { name: string } | null;
}

const entityOptions = [
  { value: "", label: "Todas" },
  { value: "booking", label: "Reservas" },
  { value: "guest", label: "Huespedes" },
  { value: "payment", label: "Pagos" },
  { value: "invoice", label: "Facturas" },
  { value: "room", label: "Habitaciones" },
  { value: "user", label: "Usuarios" },
  { value: "cash-register", label: "Caja" },
  { value: "housekeeping-task", label: "Housekeeping" },
  { value: "channel-config", label: "Canales" },
  { value: "channel-manager", label: "Channel Manager" },
];

const actionLabels: Record<string, string> = {
  create: "Crear",
  update: "Actualizar",
  delete: "Eliminar",
  cancel: "Anular",
  deactivate: "Desactivar",
  open: "Abrir",
  close: "Cerrar",
  refund: "Reembolso",
  "status-change": "Cambio estado",
  sync: "Sincronizar",
  complete: "Completar",
};

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (entity) params.set("entity", entity);
    if (userId) params.set("userId", userId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    fetch(`/api/audit-logs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      });
  }, [page, entity, userId, from, to]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="label-field">Entidad</label>
              <select
                value={entity}
                onChange={(e) => { setEntity(e.target.value); setPage(1); }}
                className="input-field"
              >
                {entityOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Usuario</label>
              <select
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setPage(1); }}
                className="input-field"
              >
                <option value="">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Accion</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.user?.name || "Sistema"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                    {log.entity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs max-w-[120px] truncate">
                    {log.entityId || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[300px] truncate">
                    {log.details || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay registros de auditoria</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {total} registros - Pagina {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
