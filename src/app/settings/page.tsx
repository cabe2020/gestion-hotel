'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { Save, Hotel, Plus, Trash2, Pencil, Calendar } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/Toast';

interface HotelData {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxRate: number;
  logo: string;
}

interface RoomTypeData {
  id: string;
  name: string;
  code: string;
  basePrice: number;
  capacity: number;
  amenities: string;
}

interface RatePlanData {
  id: string;
  name: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  price: number;
  minStay: number;
  roomType: { name: string; code: string };
}

interface UpsellData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  active: boolean;
}

const _UPSELL_CATEGORIES = [
  { value: 'late-checkout', label: 'Late Checkout' },
  { value: 'early-checkin', label: 'Early Check-in' },
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'airport-transfer', label: 'Traslado Aeropuerto' },
  { value: 'spa', label: 'Spa' },
  { value: 'minibar-package', label: 'Paquete Minibar' },
  { value: 'room-upgrade', label: 'Upgrade de Habitacion' },
  { value: 'other', label: 'Otro' },
];

const emptyTypeForm = { name: '', code: '', basePrice: 0, capacity: 2, amenities: '' };
const emptyRateForm = {
  name: '',
  roomTypeId: '',
  startDate: '',
  endDate: '',
  price: 0,
  minStay: 1,
};
const emptyUpsellForm = { name: '', description: '', price: 0, category: 'other', active: true };

export default function SettingsPage() {
  const toast = useToast();
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomTypeData[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlanData[]>([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeForm, setTypeForm] = useState(emptyTypeForm);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateForm, setRateForm] = useState(emptyRateForm);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [_upsells, setUpsells] = useState<UpsellData[]>([]);
  const [_showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellForm, setUpsellForm] = useState(emptyUpsellForm);
  const [editingUpsellId, setEditingUpsellId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const h = await fetch('/api/hotels').then((r) => r.json());
    if (h?.id) setHotel(h);
    const rt = await fetch('/api/room-types').then((r) => r.json());
    setRoomTypes(rt);
    const rp = await fetch('/api/rate-plans').then((r) => r.json());
    setRatePlans(rp);
    const us = await fetch('/api/upsells').then((r) => r.json());
    setUpsells(Array.isArray(us) ? us : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hotel?.id) {
      await fetch(`/api/hotels/${hotel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hotel),
      });
    } else {
      const h = await fetch('/api/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hotel),
      }).then((r) => r.json());
      setHotel(h);
    }
    toast.success('Datos del hotel guardados');
  };

  const openCreateType = () => {
    setEditingTypeId(null);
    setTypeForm(emptyTypeForm);
    setShowTypeModal(true);
  };

  const openEditType = (rt: RoomTypeData) => {
    setEditingTypeId(rt.id);
    setTypeForm({
      name: rt.name,
      code: rt.code,
      basePrice: rt.basePrice,
      capacity: rt.capacity,
      amenities: rt.amenities,
    });
    setShowTypeModal(true);
  };

  const handleSaveRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTypeId) {
      await fetch(`/api/room-types/${editingTypeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeForm),
      });
    } else {
      await fetch('/api/room-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeForm),
      });
    }
    setShowTypeModal(false);
    setTypeForm(emptyTypeForm);
    setEditingTypeId(null);
    load();
  };

  const handleDeleteRoomType = async (id: string) => {
    if (!(await toast.confirm('Eliminar este tipo de habitacion?'))) return;
    await fetch(`/api/room-types/${id}`, { method: 'DELETE' });
    toast.success('Tipo de habitacion eliminado');
    load();
  };

  const openCreateRate = () => {
    setEditingRateId(null);
    setRateForm({ ...emptyRateForm, roomTypeId: roomTypes[0]?.id || '' });
    setShowRateModal(true);
  };

  const openEditRate = (rp: RatePlanData) => {
    setEditingRateId(rp.id);
    setRateForm({
      name: rp.name,
      roomTypeId: rp.roomTypeId,
      startDate: new Date(rp.startDate).toISOString().split('T')[0],
      endDate: new Date(rp.endDate).toISOString().split('T')[0],
      price: rp.price,
      minStay: rp.minStay,
    });
    setShowRateModal(true);
  };

  const handleSaveRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRateId) {
      await fetch(`/api/rate-plans/${editingRateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateForm),
      });
    } else {
      await fetch('/api/rate-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateForm),
      });
    }
    setShowRateModal(false);
    setRateForm(emptyRateForm);
    setEditingRateId(null);
    load();
  };

  const handleDeleteRatePlan = async (id: string) => {
    if (!(await toast.confirm('Eliminar esta tarifa?'))) return;
    await fetch(`/api/rate-plans/${id}`, { method: 'DELETE' });
    toast.success('Tarifa eliminada');
    load();
  };

  const _openCreateUpsell = () => {
    setEditingUpsellId(null);
    setUpsellForm(emptyUpsellForm);
    setShowUpsellModal(true);
  };

  const _openEditUpsell = (us: UpsellData) => {
    setEditingUpsellId(us.id);
    setUpsellForm({
      name: us.name,
      description: us.description,
      price: us.price,
      category: us.category,
      active: us.active,
    });
    setShowUpsellModal(true);
  };

  const _handleSaveUpsell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUpsellId) {
      await fetch(`/api/upsells/${editingUpsellId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upsellForm),
      });
    } else {
      await fetch('/api/upsells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upsellForm),
      });
    }
    setShowUpsellModal(false);
    setUpsellForm(emptyUpsellForm);
    setEditingUpsellId(null);
    load();
  };

  const _handleToggleUpsell = async (us: UpsellData) => {
    await fetch(`/api/upsells/${us.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !us.active }),
    });
    load();
  };

  const _handleDeleteUpsell = async (id: string) => {
    if (!(await toast.confirm('Eliminar este servicio adicional?'))) return;
    await fetch(`/api/upsells/${id}`, { method: 'DELETE' });
    toast.success('Servicio adicional eliminado');
    load();
  };

  const isRateActive = (rp: RatePlanData) => {
    const now = new Date();
    return new Date(rp.startDate) <= now && new Date(rp.endDate) >= now;
  };

  if (!hotel) {
    return (
      <div className="p-8">
        <div className="card text-center py-12">
          <Hotel className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Configuracion Inicial</h2>
          <p className="text-gray-500 mb-4">Primero configura tu hotel.</p>
          <button
            onClick={async () => {
              await fetch('/api/seed', { method: 'POST' });
              load();
            }}
            className="btn-primary"
          >
            Crear datos iniciales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>

        <form onSubmit={handleSaveHotel} className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Hotel className="h-5 w-5 text-blue-600" />
            Datos del Hotel
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nombre</label>
              <input
                type="text"
                value={hotel.name}
                onChange={(e) => setHotel({ ...hotel, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                value={hotel.email}
                onChange={(e) => setHotel({ ...hotel, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Telefono</label>
              <input
                type="text"
                value={hotel.phone}
                onChange={(e) => setHotel({ ...hotel, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Moneda</label>
              <select
                value={hotel.currency}
                onChange={(e) => setHotel({ ...hotel, currency: e.target.value })}
                className="input-field"
              >
                <option value="USD">USD - Dolar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="MXN">MXN - Peso Mexicano</option>
                <option value="COP">COP - Peso Colombiano</option>
                <option value="ARS">ARS - Peso Argentino</option>
                <option value="CLP">CLP - Peso Chileno</option>
                <option value="PEN">PEN - Sol Peruano</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Direccion</label>
            <input
              type="text"
              value={hotel.address}
              onChange={(e) => setHotel({ ...hotel, address: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Logo del Hotel</label>
            <ImageUpload
              value={hotel.logo || ''}
              onChange={(dataUrl) => setHotel({ ...hotel, logo: dataUrl })}
              label="Arrastra el logo o haz clic para seleccionar"
              maxSizeMB={2}
            />
          </div>
          <div className="w-32">
            <label className="label-field">Impuesto (%)</label>
            <input
              type="number"
              step="0.1"
              value={hotel.taxRate}
              onChange={(e) => setHotel({ ...hotel, taxRate: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <button type="submit" className="btn-primary">
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </form>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tipos de Habitacion</h2>
            <button onClick={openCreateType} className="btn-primary">
              <Plus className="h-4 w-4" />
              Nuevo Tipo
            </button>
          </div>
          <div className="space-y-3">
            {roomTypes.map((rt) => (
              <div
                key={rt.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {rt.name} ({rt.code})
                  </p>
                  <p className="text-xs text-gray-500">
                    Precio base: ${rt.basePrice}/noche - Capacidad: {rt.capacity}
                  </p>
                  {rt.amenities && <p className="text-xs text-gray-400 mt-1">{rt.amenities}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditType(rt)}
                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoomType(rt.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {roomTypes.length === 0 && (
              <p className="text-sm text-gray-500">No hay tipos de habitacion</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              Tarifas por Temporada
            </h2>
            <button onClick={openCreateRate} className="btn-primary">
              <Plus className="h-4 w-4" />
              Nueva Tarifa
            </button>
          </div>
          {ratePlans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Nombre
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Tipo Hab.
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Desde
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Hasta
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Precio/Noche
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Min. Noches
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ratePlans.map((rp) => (
                    <tr
                      key={rp.id}
                      className={`hover:bg-gray-50 ${isRateActive(rp) ? 'bg-green-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{rp.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rp.roomType?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(rp.startDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(rp.endDate)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(rp.price)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rp.minStay}</td>
                      <td className="px-4 py-3">
                        {isRateActive(rp) ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Activa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditRate(rp)}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRatePlan(rp.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay tarifas por temporada configuradas</p>
          )}
        </div>

        <Modal
          isOpen={showTypeModal}
          onClose={() => {
            setShowTypeModal(false);
            setEditingTypeId(null);
          }}
          title={editingTypeId ? 'Editar Tipo de Habitacion' : 'Nuevo Tipo de Habitacion'}
        >
          <form onSubmit={handleSaveRoomType} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Nombre</label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Codigo</label>
                <input
                  type="text"
                  value={typeForm.code}
                  onChange={(e) =>
                    setTypeForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                  className="input-field"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Precio Base</label>
                <input
                  type="number"
                  step="0.01"
                  value={typeForm.basePrice}
                  onChange={(e) =>
                    setTypeForm((f) => ({ ...f, basePrice: parseFloat(e.target.value) || 0 }))
                  }
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Capacidad</label>
                <input
                  type="number"
                  value={typeForm.capacity}
                  onChange={(e) =>
                    setTypeForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 1 }))
                  }
                  className="input-field"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label-field">Amenidades (separadas por coma)</label>
              <input
                type="text"
                value={typeForm.amenities}
                onChange={(e) => setTypeForm((f) => ({ ...f, amenities: e.target.value }))}
                className="input-field"
                placeholder="WiFi, TV, A/C, Minibar"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingTypeId ? 'Guardar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTypeModal(false);
                  setEditingTypeId(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showRateModal}
          onClose={() => {
            setShowRateModal(false);
            setEditingRateId(null);
          }}
          title={editingRateId ? 'Editar Tarifa' : 'Nueva Tarifa'}
        >
          <form onSubmit={handleSaveRatePlan} className="space-y-4">
            <div>
              <label className="label-field">Nombre</label>
              <input
                type="text"
                value={rateForm.name}
                onChange={(e) => setRateForm((f) => ({ ...f, name: e.target.value }))}
                className="input-field"
                placeholder="Temporada Alta, Semana Santa..."
                required
              />
            </div>
            <div>
              <label className="label-field">Tipo de Habitacion</label>
              <select
                value={rateForm.roomTypeId}
                onChange={(e) => setRateForm((f) => ({ ...f, roomTypeId: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Seleccionar</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} (${rt.basePrice}/noche base)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Fecha Inicio</label>
                <input
                  type="date"
                  value={rateForm.startDate}
                  onChange={(e) => setRateForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Fecha Fin</label>
                <input
                  type="date"
                  value={rateForm.endDate}
                  onChange={(e) => setRateForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Precio por Noche</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateForm.price}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                  }
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Minimo de Noches</label>
                <input
                  type="number"
                  min={1}
                  value={rateForm.minStay}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, minStay: parseInt(e.target.value) || 1 }))
                  }
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingRateId ? 'Guardar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRateModal(false);
                  setEditingRateId(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
