import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'BK-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateInvoiceNumber() {
  const now = new Date();
  const prefix = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}-${suffix}`;
}

export const bookingStatuses = [
  { value: 'confirmed', label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
  { value: 'checked-in', label: 'Check-in', color: 'bg-green-100 text-green-800' },
  { value: 'checked-out', label: 'Check-out', color: 'bg-gray-100 text-gray-800' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-100 text-red-800' },
  { value: 'no-show', label: 'No Show', color: 'bg-yellow-100 text-yellow-800' },
];

export const roomStatuses = [
  { value: 'available', label: 'Disponible', color: 'bg-green-100 text-green-800' },
  { value: 'occupied', label: 'Ocupada', color: 'bg-blue-100 text-blue-800' },
  { value: 'maintenance', label: 'Mantenimiento', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'out-of-order', label: 'Fuera de servicio', color: 'bg-red-100 text-red-800' },
  { value: 'cleaning', label: 'Limpieza', color: 'bg-purple-100 text-purple-800' },
];

export const paymentMethods = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
  { value: 'refund', label: 'Reembolso' },
];

export const bookingSources = [
  { value: 'direct', label: 'Directo' },
  { value: 'booking', label: 'Booking.com' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'email', label: 'Email' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'other', label: 'Otro' },
];

export const cashCategories = [
  { value: 'room-revenue', label: 'Ingreso Habitación', type: 'income' },
  { value: 'food-beverage', label: 'Alimentos y Bebidas', type: 'income' },
  { value: 'services', label: 'Servicios', type: 'income' },
  { value: 'other-income', label: 'Otros Ingresos', type: 'income' },
  { value: 'salaries', label: 'Salarios', type: 'expense' },
  { value: 'supplies', label: 'Suministros', type: 'expense' },
  { value: 'maintenance', label: 'Mantenimiento', type: 'expense' },
  { value: 'utilities', label: 'Servicios Públicos', type: 'expense' },
  { value: 'other-expense', label: 'Otros Gastos', type: 'expense' },
];
