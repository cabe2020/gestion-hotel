'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { FileText, Plus, Printer, Check, Download, Ban } from 'lucide-react';
import { formatCurrency, formatDate, generateInvoiceNumber } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';

interface FolioItem {
  id: string;
  concept: string;
  amount: number;
  category: string;
  date: string;
}

interface Booking {
  id: string;
  code: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  roomRate: number;
  guest: { id: string; firstName: string; lastName: string; idNumber: string; address: string };
  room: { number: string; roomType: { name: string } };
  invoice: Invoice | null;
  folioItems?: FolioItem[];
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  taxAmount: number;
  total: number;
  status: string;
  cancelled: boolean;
  cancelReason: string;
  bookingId: string;
  booking: Booking;
}

const categoryLabels: Record<string, string> = {
  room: 'Habitacion',
  minibar: 'Minibar',
  restaurant: 'Restaurante',
  spa: 'Spa',
  laundry: 'Lavanderia',
  parking: 'Estacionamiento',
  other: 'Otro',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [hotelInfo, setHotelInfo] = useState<{
    name: string;
    address: string;
    email: string;
    phone: string;
  } | null>(null);
  const [userRole, setUserRole] = useState('');
  const [folioItemsForBooking, setFolioItemsForBooking] = useState<FolioItem[]>([]);

  const load = () => {
    fetch('/api/invoices')
      .then((r) => r.json())
      .then(setInvoices);
    fetch('/api/bookings')
      .then((r) => r.json())
      .then((res) => {
        const b = Array.isArray(res) ? res : res.data;
        setBookings(b.filter((bk: Booking) => !bk.invoice));
      });
    fetch('/api/hotels')
      .then((r) => r.json())
      .then((h) => {
        if (h) setHotelInfo({ name: h.name, address: h.address, email: h.email, phone: h.phone });
      });
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => {
        if (s?.user) setUserRole(s.user.role || '');
      });
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedBooking) {
      fetch(`/api/folio-items?bookingId=${selectedBooking}`)
        .then((r) => r.json())
        .then(setFolioItemsForBooking)
        .catch(() => setFolioItemsForBooking([]));
    } else {
      setFolioItemsForBooking([]);
    }
  }, [selectedBooking]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const booking = bookings.find((b) => b.id === selectedBooking);
    if (!booking) return;
    const hotelRes = await fetch('/api/hotels').then((r) => r.json());
    const taxRate = hotelRes?.taxRate || 0;
    const subtotal = booking.totalAmount / (1 + taxRate / 100);
    const taxAmount = booking.totalAmount - subtotal;
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: generateInvoiceNumber(),
        bookingId: booking.id,
        hotelId: hotelRes?.id,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: booking.totalAmount,
        status: booking.paidAmount >= booking.totalAmount ? 'paid' : 'pending',
      }),
    });
    setShowCreate(false);
    setSelectedBooking('');
    load();
  };

  const handleMarkPaid = async (id: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });
    load();
  };

  const handlePrint = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPrint(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    const res = await fetch('/api/invoices/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice.id }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${invoice.number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancelClick = (invoiceId: string) => {
    setCancelInvoiceId(invoiceId);
    setCancelReason('');
    setShowCancel(true);
  };

  const handleCancelConfirm = async () => {
    await fetch(`/api/invoices/${cancelInvoiceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelled: true, cancelReason }),
    });
    setShowCancel(false);
    setCancelInvoiceId('');
    setCancelReason('');
    load();
  };

  const getStatusBadge = (inv: Invoice) => {
    if (inv.cancelled) {
      return <StatusBadge label="Anulada" color="bg-red-100 text-red-800" />;
    }
    if (inv.status === 'paid') {
      return <StatusBadge label="Pagada" color="bg-green-100 text-green-800" />;
    }
    return <StatusBadge label="Pendiente" color="bg-yellow-100 text-yellow-800" />;
  };

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Facturas
          </h1>
          <div className="flex items-center gap-2">
            <ExportButton entity="invoices" />
            {bookings.length > 0 && (
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus className="h-4 w-4" /> Nueva Factura
              </button>
            )}
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay facturas generadas</p>
            <p className="text-xs text-gray-400 mt-1">
              Crea facturas desde reservas que no tengan factura asignada
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    N° Factura
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Huesped
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Habitacion
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Total
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
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-gray-50 ${inv.cancelled ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600">
                      {inv.number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {inv.booking?.guest?.firstName} {inv.booking?.guest?.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.booking?.room?.number}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(inv)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/print/invoice/${inv.id}`, '_blank')}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                          title="Imprimir"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {!inv.cancelled && inv.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkPaid(inv.id)}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600"
                            title="Marcar pagada"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {userRole === 'admin' && !inv.cancelled && (
                          <button
                            onClick={() => handleCancelClick(inv.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600"
                            title="Anular factura"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal
          isOpen={showCreate}
          onClose={() => {
            setShowCreate(false);
            setSelectedBooking('');
          }}
          title="Generar Factura"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label-field">Reserva (sin factura)</label>
              <select
                value={selectedBooking}
                onChange={(e) => setSelectedBooking(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Seleccionar reserva</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.guest?.firstName} {b.guest?.lastName} - Hab. {b.room?.number} -{' '}
                    {formatCurrency(b.totalAmount)}
                  </option>
                ))}
              </select>
            </div>
            {selectedBooking &&
              (() => {
                const b = bookings.find((bk) => bk.id === selectedBooking);
                if (!b) return null;
                return (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                    <p>
                      Check-in: {formatDate(b.checkIn)} | Check-out: {formatDate(b.checkOut)}
                    </p>
                    <p>
                      Noches: {b.totalNights} x {formatCurrency(b.roomRate)}/noche
                    </p>
                    <p className="font-semibold">
                      Total: {formatCurrency(b.totalAmount)} | Pagado:{' '}
                      {formatCurrency(b.paidAmount)}
                    </p>
                  </div>
                );
              })()}
            {folioItemsForBooking.length > 0 && (
              <div>
                <label className="label-field">Cargos adicionales (Folio)</label>
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  {folioItemsForBooking.map((fi) => (
                    <div key={fi.id} className="flex justify-between">
                      <span>
                        {fi.concept}{' '}
                        <span className="text-gray-400">
                          ({categoryLabels[fi.category] || fi.category})
                        </span>
                      </span>
                      <span className="font-medium">{formatCurrency(fi.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Generar Factura
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setSelectedBooking('');
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showPrint}
          onClose={() => setShowPrint(false)}
          title="Vista de Impresion"
          size="lg"
        >
          {selectedInvoice &&
            (() => {
              const inv = selectedInvoice;
              const b = inv.booking;
              const folioItems = b?.folioItems || [];
              return (
                <div id="invoice-print" className="space-y-6">
                  <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {inv.cancelled ? 'FACTURA ANULADA' : 'FACTURA'}
                      </h2>
                      <p className="text-sm text-gray-600">N° {inv.number}</p>
                      <p className="text-sm text-gray-600">Fecha: {formatDate(inv.date)}</p>
                      {inv.cancelled && inv.cancelReason && (
                        <p className="text-sm text-red-600 font-medium mt-1">
                          Motivo: {inv.cancelReason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {hotelInfo?.name || 'Hotel'}
                      </p>
                      <p className="text-sm text-gray-600">{hotelInfo?.address || '-'}</p>
                      <p className="text-sm text-gray-600">{hotelInfo?.email || '-'}</p>
                      <p className="text-sm text-gray-600">{hotelInfo?.phone || '-'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Datos del Huesped</h3>
                    <p className="text-sm">
                      {b?.guest?.firstName} {b?.guest?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">Doc: {b?.guest?.idNumber || '-'}</p>
                    <p className="text-sm text-gray-600">{b?.guest?.address || '-'}</p>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 font-semibold">Concepto</th>
                        <th className="text-center py-2 font-semibold">Categoria</th>
                        <th className="text-right py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {folioItems.length > 0 ? (
                        folioItems.map((fi) => (
                          <tr key={fi.id} className="border-b border-gray-100">
                            <td className="py-2">{fi.concept}</td>
                            <td className="text-center py-2 text-gray-600">
                              {categoryLabels[fi.category] || fi.category}
                            </td>
                            <td className="text-right py-2 font-medium">
                              {formatCurrency(fi.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-b border-gray-100">
                          <td className="py-2">
                            Hab. {b?.room?.number} ({b?.room?.roomType?.name}) - {b?.totalNights}{' '}
                            noches
                          </td>
                          <td className="text-center py-2 text-gray-600">Habitacion</td>
                          <td className="text-right py-2 font-medium">
                            {formatCurrency(b?.totalAmount || 0)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-300">
                        <td colSpan={2} className="text-right py-2 text-gray-600">
                          Subtotal
                        </td>
                        <td className="text-right py-2">
                          {formatCurrency(inv.total - inv.taxAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="text-right py-2 text-gray-600">
                          Impuestos
                        </td>
                        <td className="text-right py-2">{formatCurrency(inv.taxAmount)}</td>
                      </tr>
                      <tr className="border-t-2 border-gray-900">
                        <td colSpan={2} className="text-right py-2 font-bold text-lg">
                          TOTAL
                        </td>
                        <td className="text-right py-2 font-bold text-lg">
                          {formatCurrency(inv.total)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="text-right py-2 text-gray-600">
                          Pagado
                        </td>
                        <td className="text-right py-2">{formatCurrency(b?.paidAmount || 0)}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="text-right py-2 text-gray-600">
                          Pendiente
                        </td>
                        <td className="text-right py-2">
                          {formatCurrency(inv.total - (b?.paidAmount || 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="flex gap-3 pt-4">
                    <button onClick={() => window.print()} className="btn-primary flex-1">
                      <Printer className="h-4 w-4" /> Imprimir
                    </button>
                    <button onClick={() => handleDownloadPDF(inv)} className="btn-secondary flex-1">
                      <Download className="h-4 w-4" /> Descargar PDF
                    </button>
                    <button onClick={() => setShowPrint(false)} className="btn-secondary flex-1">
                      Cerrar
                    </button>
                  </div>
                </div>
              );
            })()}
        </Modal>

        <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="Anular Factura">
          <div className="space-y-4">
            <p className="text-sm text-red-600 font-medium">
              Esta accion no se puede deshacer. La factura sera marcada como anulada.
            </p>
            <div>
              <label className="label-field">Motivo de anulacion</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Ingrese el motivo de anulacion..."
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancelConfirm}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex-1"
                disabled={!cancelReason.trim()}
              >
                <Ban className="h-4 w-4 inline mr-1" /> Anular Factura
              </button>
              <button onClick={() => setShowCancel(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
