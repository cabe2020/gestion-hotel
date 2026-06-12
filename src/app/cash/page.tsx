'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import StatsCard from '@/components/StatsCard';
import Pagination from '@/components/Pagination';
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Printer,
} from 'lucide-react';
import { formatCurrency, formatDate, cashCategories } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';

interface CashMove {
  id: string;
  type: string;
  category: string;
  amount: number;
  concept: string;
  method: string;
  reference: string;
  createdAt: string;
}

interface CashRegister {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  totalIncome: number;
  totalExpense: number;
  notes: string;
  status: string;
  openedBy: string;
  closedBy: string;
}

interface UserMap {
  [key: string]: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CashPage() {
  const [moves, setMoves] = useState<CashMove[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [closeResult, setCloseResult] = useState<{
    discrepancy: number;
    expectedCash: number;
    actualCash: number;
  } | null>(null);
  const [form, setForm] = useState({
    type: 'income',
    category: 'room-revenue',
    amount: 0,
    concept: '',
    method: 'cash',
    reference: '',
  });
  const [closeForm, setCloseForm] = useState({ closingCash: 0, notes: '' });
  const [newRegister, setNewRegister] = useState({ openingCash: 0 });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalMoves, setTotalMoves] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const loadMoves = useCallback(() => {
    const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    fetch(`/api/cash-moves?${params.toString()}`)
      .then((r) => r.json())
      .then((res: PaginatedResponse<CashMove>) => {
        setMoves(res.data);
        setTotalMoves(res.total);
        setTotalPages(res.totalPages);
      });
  }, [currentPage, dateFrom, dateTo]);

  const loadRegisters = useCallback(() => {
    fetch('/api/cash-registers')
      .then((r) => r.json())
      .then(setRegisters);
  }, []);

  const loadUsers = useCallback(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) => {
        const map: UserMap = {};
        data.forEach((u) => {
          map[u.id] = u.name;
        });
        setUsers(map);
      });
  }, []);

  useEffect(() => {
    loadMoves();
  }, [loadMoves]);
  useEffect(() => {
    loadRegisters();
    loadUsers();
  }, [loadRegisters, loadUsers]);

  const activeRegister = registers.find((r) => r.status === 'open');

  const allMovesForStats = moves;

  const totalIncome = allMovesForStats
    .filter((m) => m.type === 'income')
    .reduce((s, m) => s + m.amount, 0);
  const totalExpense = allMovesForStats
    .filter((m) => m.type === 'expense')
    .reduce((s, m) => s + m.amount, 0);
  const balance = totalIncome - totalExpense;

  const filtered = filterType === 'all' ? moves : moves.filter((m) => m.type === filterType);

  const handleSubmitMove = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/cash-moves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowMoveModal(false);
    setForm({
      type: 'income',
      category: 'room-revenue',
      amount: 0,
      concept: '',
      method: 'cash',
      reference: '',
    });
    loadMoves();
  };

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/cash-registers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openingCash: newRegister.openingCash, status: 'open' }),
    });
    setShowRegisterModal(false);
    setNewRegister({ openingCash: 0 });
    loadRegisters();
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;
    const res = await fetch(`/api/cash-registers/${activeRegister.id}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...closeForm, totalIncome, totalExpense }),
    });
    const data = await res.json();
    setCloseResult({
      discrepancy: data.discrepancy,
      expectedCash: data.expectedCash,
      actualCash: data.actualCash,
    });
    loadRegisters();
    loadMoves();
  };

  const handleCloseModal = () => {
    setShowCloseModal(false);
    setCloseResult(null);
  };

  const incomeCategories = cashCategories.filter((c) => c.type === 'income');
  const expenseCategories = cashCategories.filter((c) => c.type === 'expense');
  const getCategoryLabel = (val: string) =>
    cashCategories.find((c) => c.value === val)?.label || val;

  const getDiscrepancyAlert = (discrepancy: number) => {
    const abs = Math.abs(discrepancy);
    if (abs === 0)
      return {
        label: 'Cuadre correcto',
        color: 'bg-green-50 border-green-300 text-green-800',
        icon: CheckCircle,
      };
    if (abs < 10)
      return {
        label: 'Diferencia menor',
        color: 'bg-yellow-50 border-yellow-300 text-yellow-800',
        icon: AlertTriangle,
      };
    return {
      label: 'DISCREPANCIA',
      color: 'bg-red-50 border-red-300 text-red-800',
      icon: AlertTriangle,
    };
  };

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
          <div className="flex gap-2">
            <ExportButton entity="cash-moves" />
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (dateFrom) params.set('from', dateFrom);
                if (dateTo) params.set('to', dateTo);
                window.open(`/print/cash?${params.toString()}`, '_blank');
              }}
              className="btn-secondary inline-flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            {activeRegister ? (
              <>
                <button onClick={() => setShowMoveModal(true)} className="btn-primary">
                  <Plus className="h-4 w-4" /> Nuevo Movimiento
                </button>
                <button
                  onClick={() => {
                    setCloseForm({ closingCash: 0, notes: '' });
                    setCloseResult(null);
                    setShowCloseModal(true);
                  }}
                  className="btn-danger"
                >
                  <Lock className="h-4 w-4" /> Cerrar Caja
                </button>
              </>
            ) : (
              <button onClick={() => setShowRegisterModal(true)} className="btn-success">
                <Unlock className="h-4 w-4" /> Abrir Caja
              </button>
            )}
          </div>
        </div>

        {activeRegister && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Caja abierta</p>
              <p className="text-xs text-blue-600">
                Desde: {formatDate(activeRegister.openedAt)} - Fondo inicial:{' '}
                {formatCurrency(activeRegister.openingCash)}
                {activeRegister.openedBy && users[activeRegister.openedBy]
                  ? ` - Abierta por: ${users[activeRegister.openedBy]}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700">Activa</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Ingresos"
            value={formatCurrency(totalIncome)}
            icon={TrendingUp}
            color="bg-green-500"
          />
          <StatsCard
            title="Gastos"
            value={formatCurrency(totalExpense)}
            icon={TrendingDown}
            color="bg-red-500"
          />
          <StatsCard
            title="Balance"
            value={formatCurrency(balance)}
            icon={DollarSign}
            color={balance >= 0 ? 'bg-blue-500' : 'bg-red-500'}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'income' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Gastos
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="input-field py-1.5 text-sm"
              placeholder="Desde"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="input-field py-1.5 text-sm"
              placeholder="Hasta"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setCurrentPage(1);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Categoría
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Concepto
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Método
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((move) => (
                <tr key={move.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(move.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${move.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {move.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {getCategoryLabel(move.category)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{move.concept}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                    {move.method === 'cash'
                      ? 'Efectivo'
                      : move.method === 'card'
                        ? 'Tarjeta'
                        : 'Transferencia'}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-medium text-right ${move.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {move.type === 'income' ? '+' : '-'}
                    {formatCurrency(move.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay movimientos</p>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalMoves}
            itemsPerPage={limit}
            onPageChange={setCurrentPage}
          />
        </div>

        {registers.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Cierres</h2>
            <div className="space-y-3">
              {registers
                .filter((r) => r.status === 'closed')
                .map((reg) => {
                  const expectedCash = reg.openingCash + reg.totalIncome - reg.totalExpense;
                  const discrepancy =
                    reg.closingCash !== null
                      ? Math.round((reg.closingCash - expectedCash) * 100) / 100
                      : 0;
                  const alert = getDiscrepancyAlert(discrepancy);
                  const AlertIcon = alert.icon;
                  return (
                    <div key={reg.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Cierre del {formatDate(reg.closedAt!)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Apertura: {formatDate(reg.openedAt)} - Fondo:{' '}
                            {formatCurrency(reg.openingCash)}
                            {reg.openedBy && users[reg.openedBy]
                              ? ` - Abierta por: ${users[reg.openedBy]}`
                              : ''}
                            {reg.closedBy && users[reg.closedBy]
                              ? ` - Cerrada por: ${users[reg.closedBy]}`
                              : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            Ingresos: {formatCurrency(reg.totalIncome)}
                          </p>
                          <p className="text-sm font-medium text-red-600">
                            Gastos: {formatCurrency(reg.totalExpense)}
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            Cierre: {formatCurrency(reg.closingCash || 0)}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border ${alert.color}`}
                      >
                        <AlertIcon className="h-4 w-4" />
                        <span className="text-sm font-semibold">{alert.label}</span>
                        {discrepancy !== 0 && (
                          <span className="text-sm">
                            ({discrepancy > 0 ? '+' : ''}
                            {formatCurrency(discrepancy)})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <Modal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          title="Nuevo Movimiento"
          size="lg"
        >
          <form onSubmit={handleSubmitMove} className="space-y-4">
            <div>
              <label className="label-field">Tipo</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value,
                    category: e.target.value === 'income' ? 'room-revenue' : 'salaries',
                  }))
                }
                className="input-field"
              >
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
              </select>
            </div>
            <div>
              <label className="label-field">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="input-field"
              >
                {(form.type === 'income' ? incomeCategories : expenseCategories).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Monto</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))
                }
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Concepto</label>
              <input
                type="text"
                value={form.concept}
                onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Método de Pago</label>
              <select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                className="input-field"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="label-field">Referencia</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Registrar
              </button>
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          title="Abrir Caja"
        >
          <form onSubmit={handleOpenRegister} className="space-y-4">
            <div>
              <label className="label-field">Fondo inicial de caja</label>
              <input
                type="number"
                step="0.01"
                value={newRegister.openingCash}
                onChange={(e) => setNewRegister({ openingCash: parseFloat(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-success flex-1">
                Abrir Caja
              </button>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={showCloseModal} onClose={handleCloseModal} title="Cerrar Caja">
          {!closeResult ? (
            <form onSubmit={handleCloseRegister} className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                <p className="text-sm text-gray-600">
                  Ingresos del día:{' '}
                  <span className="font-medium text-green-600">{formatCurrency(totalIncome)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Gastos del día:{' '}
                  <span className="font-medium text-red-600">{formatCurrency(totalExpense)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Fondo inicial:{' '}
                  <span className="font-medium">
                    {formatCurrency(activeRegister?.openingCash || 0)}
                  </span>
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  Total esperado:{' '}
                  {formatCurrency((activeRegister?.openingCash || 0) + totalIncome - totalExpense)}
                </p>
              </div>
              <div>
                <label className="label-field">Efectivo en caja (conteo físico)</label>
                <input
                  type="number"
                  step="0.01"
                  value={closeForm.closingCash}
                  onChange={(e) =>
                    setCloseForm((f) => ({ ...f, closingCash: parseFloat(e.target.value) || 0 }))
                  }
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Notas</label>
                <textarea
                  value={closeForm.notes}
                  onChange={(e) => setCloseForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-danger flex-1">
                  Confirmar Cierre
                </button>
                <button type="button" onClick={handleCloseModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                <p className="text-sm text-gray-600">
                  Efectivo esperado:{' '}
                  <span className="font-medium">{formatCurrency(closeResult.expectedCash)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Efectivo contado:{' '}
                  <span className="font-medium">{formatCurrency(closeResult.actualCash)}</span>
                </p>
              </div>
              {(() => {
                const alert = getDiscrepancyAlert(closeResult.discrepancy);
                const AlertIcon = alert.icon;
                return (
                  <div
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${alert.color}`}
                  >
                    <AlertIcon className="h-5 w-5" />
                    <span className="font-semibold">{alert.label}</span>
                    {closeResult.discrepancy !== 0 && (
                      <span>
                        ({closeResult.discrepancy > 0 ? '+' : ''}
                        {formatCurrency(closeResult.discrepancy)})
                      </span>
                    )}
                  </div>
                );
              })()}
              <button onClick={handleCloseModal} className="btn-secondary w-full">
                Cerrar
              </button>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
