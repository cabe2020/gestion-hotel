'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Bed, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { roomStatuses } from './types';
import { useToast } from '@/components/Toast';
import { registerShortcutAction } from '@/components/KeyboardShortcuts';
import ImageUpload from '@/components/ImageUpload';
import Image from 'next/image';

interface RoomType {
  id: string;
  name: string;
  code: string;
  basePrice: number;
  capacity: number;
  amenities: string;
}

interface RoomWithRelations {
  id: string;
  number: string;
  floor: number;
  status: string;
  roomTypeId: string;
  roomType: RoomType;
  bookings: { id: string; guest?: { firstName: string; lastName: string } }[];
}

export default function RoomsPage() {
  const toast = useToast();
  const [rooms, setRooms] = useState<RoomWithRelations[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomWithRelations | null>(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    number: '',
    floor: 1,
    status: 'available',
    roomTypeId: '',
  });
  const [imageRoomId, setImageRoomId] = useState<string | null>(null);
  const [roomImages, setRoomImages] = useState<Record<string, string>>({});

  const loadRooms = () =>
    fetch('/api/rooms')
      .then((r) => r.json())
      .then(setRooms);

  const loadRoomTypes = () =>
    fetch('/api/room-types')
      .then((r) => r.json())
      .then(setRoomTypes);

  useEffect(() => {
    loadRooms();
    loadRoomTypes();
    fetch('/api/rooms/images')
      .then((r) => r.json())
      .then((data) => setRoomImages(data || {}))
      .catch(() => {});
    registerShortcutAction('newRoom', () => {
      setEditingRoom(null);
      setForm({ number: '', floor: 1, status: 'available', roomTypeId: roomTypes[0]?.id || '' });
      setShowModal(true);
    });
    return () => registerShortcutAction('newRoom', null);
  }, [roomTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let ok = true;
    if (editingRoom) {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      ok = res.ok;
    } else {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      ok = res.ok;
    }
    if (ok) {
      toast.success(editingRoom ? 'Habitacion actualizada' : 'Habitacion creada');
    } else {
      toast.error('Error al guardar habitacion');
    }
    setShowModal(false);
    setEditingRoom(null);
    setForm({ number: '', floor: 1, status: 'available', roomTypeId: '' });
    loadRooms();
  };

  const handleEdit = (room: RoomWithRelations) => {
    setEditingRoom(room);
    setForm({
      number: room.number,
      floor: room.floor,
      status: room.status,
      roomTypeId: room.roomTypeId,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await toast.confirm('Eliminar esta habitación?'))) return;
    await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
    toast.success('Habitacion eliminada');
    loadRooms();
  };

  const handleImageSave = async (roomId: string, dataUrl: string) => {
    await fetch('/api/rooms/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, image: dataUrl }),
    });
    setRoomImages((prev) => ({ ...prev, [roomId]: dataUrl }));
    setImageRoomId(null);
  };

  const filtered = filter === 'all' ? rooms : rooms.filter((r) => r.status === filter);

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    'out-of-order': 'bg-red-100 text-red-800',
    cleaning: 'bg-purple-100 text-purple-800',
  };

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Habitaciones</h1>
          <button
            onClick={() => {
              setEditingRoom(null);
              setForm({
                number: '',
                floor: 1,
                status: 'available',
                roomTypeId: roomTypes[0]?.id || '',
              });
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> Nueva Habitación
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({rooms.length})
          </button>
          {roomStatuses.map((s) => {
            const count = rooms.filter((r) => r.status === s.value).length;
            return (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === s.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((room) => (
            <div key={room.id} className="card hover:shadow-md transition-shadow">
              {roomImages[room.id] ? (
                <Image
                  src={roomImages[room.id]}
                  alt={`Hab. ${room.number}`}
                  width={400}
                  height={128}
                  className="w-full h-32 object-cover rounded-t-lg mb-3"
                />
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg mb-3 flex items-center justify-center">
                  <Bed className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bed className="h-5 w-5 text-gray-400" />
                  <span className="text-lg font-bold text-gray-900">Hab. {room.number}</span>
                </div>
                <StatusBadge
                  label={roomStatuses.find((s) => s.value === room.status)?.label || room.status}
                  color={statusColors[room.status] || 'bg-gray-100'}
                />
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p>
                  Tipo: <span className="font-medium text-gray-900">{room.roomType?.name}</span>
                </p>
                <p>Piso: {room.floor}</p>
                <p>Capacidad: {room.roomType?.capacity} personas</p>
                <p>Precio: ${room.roomType?.basePrice}/noche</p>
              </div>

              {room.bookings?.length > 0 && (
                <div className="text-xs text-blue-600 mb-3">
                  Reserva activa: {room.bookings[0].guest?.firstName}{' '}
                  {room.bookings[0].guest?.lastName}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(room)}
                  className="flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-blue-600 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  onClick={() => setImageRoomId(room.id)}
                  className="flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-amber-600 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Imagen
                </button>
                <button
                  onClick={() => handleDelete(room.id)}
                  className="flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-red-600 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingRoom(null);
          }}
          title={editingRoom ? 'Editar Habitación' : 'Nueva Habitación'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">Número</label>
              <input
                type="text"
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Piso</label>
              <input
                type="number"
                value={form.floor}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    floor: parseInt(e.target.value) || 1,
                  }))
                }
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Tipo de Habitación</label>
              <select
                value={form.roomTypeId}
                onChange={(e) => setForm((f) => ({ ...f, roomTypeId: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Seleccionar tipo</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} - ${rt.basePrice}/noche
                  </option>
                ))}
              </select>
            </div>
            {editingRoom && (
              <div>
                <label className="label-field">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="input-field"
                >
                  {roomStatuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingRoom ? 'Guardar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={!!imageRoomId}
          onClose={() => setImageRoomId(null)}
          title="Imagen de Habitacion"
        >
          {imageRoomId && (
            <div className="space-y-4">
              <ImageUpload
                value={roomImages[imageRoomId] || ''}
                onChange={(dataUrl) => handleImageSave(imageRoomId, dataUrl)}
                label="Arrastra una imagen o haz clic para seleccionar"
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setImageRoomId(null)} className="btn-secondary flex-1">
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
