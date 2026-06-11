"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import {
  Globe,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  AlertTriangle,
} from "lucide-react";

interface ChannelInfo {
  channel: string;
  name: string;
  color: string;
  hotelCode: string;
  active: boolean;
  lastSync: string | null;
}

interface SyncResult {
  channel: string;
  name: string;
  status: string;
  reason?: string;
  availabilitySynced: number;
  bookingsFetched: number;
}

const SUPPORTED_CHANNELS = [
  { key: "booking", name: "Booking.com", color: "#003580" },
  { key: "expedia", name: "Expedia", color: "#FBAF17" },
  { key: "airbnb", name: "Airbnb", color: "#FF5A5F" },
  { key: "despegar", name: "Despegar", color: "#4300D2" },
];

export default function ChannelManagerPage() {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState("");
  const [form, setForm] = useState({
    hotelCode: "",
    apiKey: "",
    active: true,
  });

  const load = async () => {
    try {
      const res = await fetch("/api/channel-manager");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResults([]);
    try {
      const res = await fetch("/api/channel-manager/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncResults(data.results || []);
      }
    } catch {}
    setSyncing(false);
    load();
  };

  const handleSyncChannel = async (channelKey: string) => {
    setSyncingChannel(channelKey);
    try {
      const res = await fetch("/api/channel-manager/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncResults(data.results || []);
      }
    } catch {}
    setSyncingChannel(null);
    load();
  };

  const openConfig = (channelKey: string) => {
    const existing = channels.find((c) => c.channel === channelKey);
    setEditingChannel(channelKey);
    setForm({
      hotelCode: existing?.hotelCode || "",
      apiKey: "",
      active: existing?.active ?? false,
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/channel-manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: editingChannel,
        hotelCode: form.hotelCode,
        apiKey: form.apiKey,
        active: form.active,
      }),
    });
    setShowConfigModal(false);
    load();
  };

  const getChannelInfo = (key: string) => {
    const ch = channels.find((c) => c.channel === key);
    const meta = SUPPORTED_CHANNELS.find((s) => s.key === key);
    return { ...ch, meta };
  };

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Channel Manager / Canales de Venta
            </h1>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Sincronizando..." : "Sincronizar Todo"}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Conecta tu hotel con los principales canales de venta online. La
            sincronizacion mantiene disponibilidad y tarifas actualizadas en
            todos los canales.
          </p>
        </div>

        {syncResults.length > 0 && (
          <div
            className={`rounded-lg p-4 border ${
              syncResults.some((r) => r.status === "error")
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <p className="text-sm font-semibold mb-2 text-gray-900">
              Resultados de sincronizacion
            </p>
            <div className="space-y-1">
              {syncResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  {r.status === "success" ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : r.status === "error" ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      r.status === "error"
                        ? "text-red-700"
                        : r.status === "success"
                        ? "text-green-700"
                        : "text-gray-500"
                    }`}
                  >
                    {r.name}:{" "}
                    {r.status === "skipped"
                      ? "Inactivo"
                      : r.status === "error"
                      ? r.reason
                      : `${r.availabilitySynced} disponibilidades, ${r.bookingsFetched} reservas`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUPPORTED_CHANNELS.map((ch) => {
            const info = getChannelInfo(ch.key);
            const isActive = info?.active ?? false;
            const isChannelSyncing = syncingChannel === ch.key;

            return (
              <div key={ch.key} className="card overflow-hidden p-0">
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: ch.color }}
                >
                  <span className="text-white text-sm font-bold">
                    {ch.name}
                  </span>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white/70 text-xs font-medium">
                      <XCircle className="h-3 w-3" />
                      Desconectado
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {info?.hotelCode && (
                    <p className="text-xs text-gray-500">
                      Hotel: <span className="font-mono text-gray-700">{info.hotelCode}</span>
                    </p>
                  )}

                  {info?.lastSync && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date(info.lastSync).toLocaleString("es-ES")}
                      </span>
                    </div>
                  )}

                  {!info?.lastSync && (
                    <p className="text-xs text-gray-400 italic">
                      Sin sincronizacion previa
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => openConfig(ch.key)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Configurar
                    </button>
                    <button
                      onClick={() => handleSyncChannel(ch.key)}
                      disabled={isChannelSyncing || !isActive}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          isChannelSyncing ? "animate-spin" : ""
                        }`}
                      />
                      {isChannelSyncing ? "Sync..." : "Sincronizar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title={`Configurar ${
          SUPPORTED_CHANNELS.find((c) => c.key === editingChannel)?.name ||
          editingChannel
        }`}
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="label-field">Codigo de Hotel</label>
            <input
              type="text"
              value={form.hotelCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, hotelCode: e.target.value }))
              }
              className="input-field"
              placeholder="Ej: HOTEL-12345"
              required
            />
          </div>
          <div>
            <label className="label-field">API Key</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiKey: e.target.value }))
              }
              className="input-field"
              placeholder="Ingrese su API key"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active-check"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="active-check" className="text-sm text-gray-700">
              Canal activo
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
