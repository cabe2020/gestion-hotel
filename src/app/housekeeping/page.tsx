'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import {
  Sparkles,
  ClipboardCheck,
  Wrench,
  SprayCan,
  Plus,
  Clock,
  User,
  Play,
  Check,
  RefreshCw,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';

interface RoomWithRelations {
  id: string;
  number: string;
  floor: number;
  status: string;
  cleaningStatus: string;
  roomType: { id: string; name: string; code: string; basePrice: number; capacity: number };
  bookings: { id: string; guest?: { firstName: string; lastName: string } }[];
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface HousekeepingTask {
  id: string;
  roomId: string;
  type: string;
  status: string;
  assignedTo: string | null;
  priority: string;
  notes: string;
  completedAt: string | null;
  createdAt: string;
  room: { id: string; number: string; roomType: { name: string } };
  assignedUser: { id: string; name: string; email: string } | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  cleaning: <Sparkles className="h-4 w-4" />,
  inspection: <ClipboardCheck className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  'deep-clean': <SprayCan className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  cleaning: 'Limpieza',
  inspection: 'Inspección',
  maintenance: 'Mantenimiento',
  'deep-clean': 'Limpieza profunda',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  'in-progress': 'En progreso',
  completed: 'Completada',
};

const cleaningColors: Record<string, string> = {
  clean: 'bg-green-100 text-green-700',
  dirty: 'bg-red-100 text-red-700',
  inspecting: 'bg-yellow-100 text-yellow-700',
};

const cleaningLabels: Record<string, string> = {
  clean: 'Limpia',
  dirty: 'Sucia',
  inspecting: 'Inspeccionando',
};

const roomStatusLabels: Record<string, string> = {
  available: 'Disponible',
  occupied: 'Ocupada',
  maintenance: 'Mantenimiento',
  'out-of-order': 'Fuera de servicio',
  cleaning: 'Limpieza',
};

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState<RoomWithRelations[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [kanbanView, setKanbanView] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState({
    roomId: '',
    type: 'cleaning' as string,
    priority: 'normal' as string,
    assignedTo: '',
    notes: '',
  });

  const loadRooms = () =>
    fetch('/api/rooms')
      .then((r) => r.json())
      .then(setRooms);

  const loadTasks = () =>
    fetch('/api/housekeeping')
      .then((r) => r.json())
      .then(setTasks);

  const loadUsers = () =>
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      });

  useEffect(() => {
    loadRooms();
    loadTasks();
    loadUsers();
  }, []);

  const totalRooms = rooms.length;
  const cleanCount = rooms.filter((r) => r.cleaningStatus === 'clean').length;
  const dirtyCount = rooms.filter((r) => r.cleaningStatus === 'dirty').length;
  const inspectingCount = rooms.filter((r) => r.cleaningStatus === 'inspecting').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in-progress').length;
  const completedToday = tasks.filter((t) => {
    if (t.status !== 'completed') return false;
    if (!t.completedAt) return false;
    const today = new Date();
    const completed = new Date(t.completedAt);
    return (
      completed.getDate() === today.getDate() &&
      completed.getMonth() === today.getMonth() &&
      completed.getFullYear() === today.getFullYear()
    );
  }).length;

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    return true;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/housekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ roomId: '', type: 'cleaning', priority: 'normal', assignedTo: '', notes: '' });
    loadRooms();
    loadTasks();
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await fetch(`/api/housekeeping/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    loadRooms();
    loadTasks();
  };

  const handleReassign = async (taskId: string, userId: string) => {
    await fetch(`/api/housekeeping/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: userId }),
    });
    loadTasks();
  };

  const handleQuickStatus = async (roomId: string, status: string) => {
    await fetch(`/api/rooms/${roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cleaningStatus: status }),
    });
    loadRooms();
  };

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d));

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Housekeeping / Limpieza
          </h1>
          <button
            onClick={() => {
              setForm({
                roomId: rooms[0]?.id || '',
                type: 'cleaning',
                priority: 'normal',
                assignedTo: '',
                notes: '',
              });
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> Nueva Tarea
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
            <p className="text-xs text-gray-500">Total habitaciones</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-green-600">{cleanCount}</p>
            <p className="text-xs text-gray-500">Limpias</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-red-600">{dirtyCount}</p>
            <p className="text-xs text-gray-500">Sucias</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-yellow-600">{inspectingCount}</p>
            <p className="text-xs text-gray-500">Inspeccionando</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            <p className="text-xs text-gray-500">Tareas pendientes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Estado de Habitaciones</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {rooms.map((room) => (
                <div key={room.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-gray-900">Hab. {room.number}</span>
                    <StatusBadge
                      label={cleaningLabels[room.cleaningStatus] || room.cleaningStatus}
                      color={cleaningColors[room.cleaningStatus] || 'bg-gray-100'}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{room.roomType?.name}</p>
                  <p className="text-xs text-gray-400 mb-3">
                    {roomStatusLabels[room.status] || room.status}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleQuickStatus(room.id, 'dirty')}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                    >
                      Marcar Sucia
                    </button>
                    <button
                      onClick={() => handleQuickStatus(room.id, 'clean')}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-medium transition-colors"
                    >
                      Marcar Limpia
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Tareas de Limpieza</h2>

            <div className="flex gap-2 flex-wrap mb-3">
              <div className="flex gap-1.5">
                {(['all', 'pending', 'in-progress', 'completed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === s
                        ? 'bg-slate-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s === 'all' ? 'Todas' : statusLabels[s] || s}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {(['all', 'cleaning', 'inspection', 'maintenance', 'deep-clean'] as const).map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        typeFilter === t
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'all' ? 'Todos' : typeLabels[t] || t}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
              {filteredTasks.length === 0 && (
                <div className="card text-center py-8">
                  <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No hay tareas con estos filtros</p>
                </div>
              )}
              {filteredTasks.map((task) => (
                <div key={task.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">
                        {typeIcons[task.type] || <Sparkles className="h-4 w-4" />}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        Hab. {task.room?.number}
                      </span>
                      <StatusBadge
                        label={typeLabels[task.type] || task.type}
                        color="bg-gray-100 text-gray-700"
                      />
                    </div>
                    <StatusBadge
                      label={priorityLabels[task.priority] || task.priority}
                      color={priorityColors[task.priority] || 'bg-gray-100'}
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.assignedUser?.name || 'Sin asignar'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(task.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <StatusBadge
                      label={statusLabels[task.status] || task.status}
                      color={statusColors[task.status] || 'bg-gray-100'}
                    />
                    <div className="flex gap-1.5">
                      {task.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(task.id, 'in-progress')}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                        >
                          <Play className="h-3 w-3" /> Iniciar
                        </button>
                      )}
                      {task.status === 'in-progress' && (
                        <button
                          onClick={() => handleStatusChange(task.id, 'completed')}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-medium transition-colors"
                        >
                          <Check className="h-3 w-3" /> Completar
                        </button>
                      )}
                      {task.status !== 'completed' && (
                        <select
                          value={task.assignedTo || ''}
                          onChange={(e) => handleReassign(task.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                        >
                          <option value="">Reasignar...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {task.notes && <p className="text-xs text-gray-400 mt-2 italic">{task.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Tarea">
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="label-field">Habitación</label>
              <select
                value={form.roomId}
                onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Seleccionar habitación</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Hab. {r.number} - {r.roomType?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="input-field"
              >
                <option value="cleaning">Limpieza</option>
                <option value="inspection">Inspección</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="deep-clean">Limpieza profunda</option>
              </select>
            </div>
            <div>
              <label className="label-field">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="input-field"
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="label-field">Asignar a</label>
              <select
                value={form.assignedTo}
                onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                className="input-field"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Crear
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
      </div>
    </div>
  );
}
