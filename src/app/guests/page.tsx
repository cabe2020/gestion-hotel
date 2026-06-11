"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import ExportButton from "@/components/ExportButton";
import { Plus, Edit2, Trash2, Search, Eye, Star, Tag, X } from "lucide-react";
import { formatDate, bookingStatuses } from "@/lib/utils";

interface Booking {
  id: string;
  code: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paidAmount: number;
  room: { number: string; roomType: { name: string } };
}

interface TagData {
  id: string;
  name: string;
  color: string;
}

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  nationality: string;
  address: string;
  notes: string;
  vip: boolean;
  dateOfBirth: string | null;
  bookings: Booking[];
  tags: { id: string; tag: TagData }[];
}

export default function GuestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Cargando...</div>}>
      <GuestsContent />
    </Suspense>
  );
}

function GuestsContent() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestTags, setGuestTags] = useState<TagData[]>([]);
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [search, setSearch] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const [filterVip, setFilterVip] = useState<"all" | "vip" | "no-vip">("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGuests, setTotalGuests] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idNumber: "",
    nationality: "",
    address: "",
    notes: "",
    vip: false,
    dateOfBirth: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/guests?${params.toString()}`).then(r => r.json()).then(res => {
      setGuests(res.data);
      setTotalGuests(res.total);
      setTotalPages(res.totalPages);
    });
    fetch("/api/guest-tags").then(r => r.json()).then(setAllTags);
  }, [currentPage, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    if (editingGuest) {
      await fetch(`/api/guests/${editingGuest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowModal(false);
    setEditingGuest(null);
    setForm({ firstName: "", lastName: "", email: "", phone: "", idNumber: "", nationality: "", address: "", notes: "", vip: false, dateOfBirth: "" });
    load();
  };

  const handleEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setForm({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      idNumber: guest.idNumber,
      nationality: guest.nationality,
      address: guest.address,
      notes: guest.notes,
      vip: guest.vip,
      dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth).toISOString().split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este huesped?")) return;
    await fetch(`/api/guests/${id}`, { method: "DELETE" });
    load();
  };

  const handleViewDetail = async (id: string) => {
    const res = await fetch(`/api/guests/${id}`);
    const data = await res.json();
    setSelectedGuest(data);
    const tagRes = await fetch(`/api/guests/${id}/tags`);
    setGuestTags(await tagRes.json());
    setShowDetail(true);
  };

  const handleAssignTag = async (tagId: string) => {
    if (!selectedGuest) return;
    await fetch(`/api/guests/${selectedGuest.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    const tagRes = await fetch(`/api/guests/${selectedGuest.id}/tags`);
    setGuestTags(await tagRes.json());
    load();
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!selectedGuest) return;
    await fetch(`/api/guests/${selectedGuest.id}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    const tagRes = await fetch(`/api/guests/${selectedGuest.id}/tags`);
    setGuestTags(await tagRes.json());
    load();
  };

  const getGuestTags = (guest: Guest): TagData[] => {
    return (guest.tags || []).map((t) => t.tag).filter(Boolean) as TagData[];
  };

  const filtered = guests.filter(g => {
    const matchVip = filterVip === "all" || (filterVip === "vip" && g.vip) || (filterVip === "no-vip" && !g.vip);
    const matchTag = filterTag === "all" || getGuestTags(g).some(t => t.id === filterTag);
    return matchVip && matchTag;
  });

  const tagColorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800",
    pink: "bg-pink-100 text-pink-800",
    orange: "bg-orange-100 text-orange-800",
    gray: "bg-gray-100 text-gray-800",
  };

  const getTagColor = (color: string) => tagColorMap[color] || "bg-gray-100 text-gray-800";

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Huespedes</h1>
          <div className="flex items-center gap-2">
            <ExportButton entity="guests" />
            <button
              onClick={() => {
                setEditingGuest(null);
                setForm({ firstName: "", lastName: "", email: "", phone: "", idNumber: "", nationality: "", address: "", notes: "", vip: false, dateOfBirth: "" });
                setShowModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> Nuevo Huesped
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, documento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterVip}
            onChange={e => setFilterVip(e.target.value as "all" | "vip" | "no-vip")}
            className="input-field w-auto"
          >
            <option value="all">Todos</option>
            <option value="vip">VIP</option>
            <option value="no-vip">No VIP</option>
          </select>
          {allTags.length > 0 && (
            <select
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">Todas las etiquetas</option>
              {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nacionalidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reservas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(guest => {
                const gTags = getGuestTags(guest);
                return (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {guest.vip && <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
                        <div>
                          <span className="text-sm font-medium text-gray-900">{guest.firstName} {guest.lastName}</span>
                          {gTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {gTags.map(tag => (
                                <span key={tag.id} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getTagColor(tag.color)}`}>
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{guest.idNumber || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{guest.email || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{guest.phone || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{guest.nationality || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        {guest.bookings?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleViewDetail(guest.id)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleEdit(guest)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Editar">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(guest.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No hay huespedes</p>}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalGuests}
            itemsPerPage={limit}
            onPageChange={setCurrentPage}
          />
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingGuest(null); }}
          title={editingGuest ? "Editar Huesped" : "Nuevo Huesped"}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Nombre</label>
                <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="label-field">Apellido</label>
                <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label-field">Telefono</label>
                <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Documento de Identidad</label>
                <input type="text" value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label-field">Nacionalidad</label>
                <input type="text" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label-field">Direccion</label>
              <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Fecha de Nacimiento</label>
                <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="input-field" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.vip}
                    onChange={e => setForm(f => ({ ...f, vip: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <Star className={`h-4 w-4 ${form.vip ? "text-amber-500 fill-amber-500" : "text-gray-400"}`} />
                  <span className="text-sm font-medium text-gray-700">VIP</span>
                </label>
              </div>
            </div>
            <div>
              <label className="label-field">Notas</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">{editingGuest ? "Guardar" : "Crear"}</button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          title={`Detalle - ${selectedGuest?.firstName} ${selectedGuest?.lastName}`}
          size="lg"
        >
          {selectedGuest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                <div><p className="text-xs text-gray-500">Documento</p><p className="text-sm font-medium">{selectedGuest.idNumber || "-"}</p></div>
                <div><p className="text-xs text-gray-500">Nacionalidad</p><p className="text-sm font-medium">{selectedGuest.nationality || "-"}</p></div>
                <div><p className="text-xs text-gray-500">Email</p><p className="text-sm font-medium">{selectedGuest.email || "-"}</p></div>
                <div><p className="text-xs text-gray-500">Telefono</p><p className="text-sm font-medium">{selectedGuest.phone || "-"}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-500">Direccion</p><p className="text-sm font-medium">{selectedGuest.address || "-"}</p></div>
                <div>
                  <p className="text-xs text-gray-500">VIP</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {selectedGuest.vip ? <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fecha de Nacimiento</p>
                  <p className="text-sm font-medium">{selectedGuest.dateOfBirth ? formatDate(selectedGuest.dateOfBirth) : "-"}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Tag className="h-4 w-4" /> Etiquetas
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {guestTags.length > 0 ? guestTags.map(tag => (
                    <span key={tag.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getTagColor(tag.color)}`}>
                      {tag.name}
                      <button onClick={() => handleRemoveTag(tag.id)} className="hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )) : (
                    <p className="text-xs text-gray-500">Sin etiquetas</p>
                  )}
                </div>
                {allTags.filter(t => !guestTags.some(gt => gt.id === t.id)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.filter(t => !guestTags.some(gt => gt.id === t.id)).map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => handleAssignTag(tag.id)}
                        className="px-2 py-0.5 rounded text-xs border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Historial de Reservas</h3>
                {selectedGuest.bookings?.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin reservas</p>
                ) : (
                  <div className="space-y-2">
                    {selectedGuest.bookings.map((b: Booking) => {
                      const status = bookingStatuses.find(s => s.value === b.status);
                      return (
                        <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Hab. {b.room?.number} - {b.room?.roomType?.name}</p>
                            <p className="text-xs text-gray-500">{formatDate(b.checkIn)} - {formatDate(b.checkOut)}</p>
                          </div>
                          {status && <StatusBadge label={status.label} color={status.color} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
