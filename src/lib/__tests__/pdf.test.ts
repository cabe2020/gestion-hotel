import { describe, it, expect } from 'vitest';
import { generateInvoicePDF, generateReceiptPDF } from '../pdf';

const mockInvoiceData = {
  hotel: {
    name: 'Test Hotel',
    address: '123 Main St',
    phone: '555-1234',
    email: 'test@hotel.com',
    taxId: 'TAX123',
    currency: 'USD',
    taxRate: 16,
  },
  invoice: {
    number: 'FAC-202501-0001',
    date: '2025-01-15',
    status: 'paid',
    taxAmount: 27.59,
    total: 200,
    cancelled: false,
    cancelReason: '',
  },
  booking: {
    code: 'BK-ABC123',
    checkIn: '2025-01-10',
    checkOut: '2025-01-12',
    totalNights: 2,
    roomRate: 86.21,
    totalAmount: 200,
    paidAmount: 200,
    specialRequests: '',
  },
  guest: {
    firstName: 'Juan',
    lastName: 'Perez',
    email: 'juan@test.com',
    phone: '555-5678',
    idNumber: 'ID12345',
    address: '456 Oak Ave',
  },
  room: {
    number: '101',
    roomType: { name: 'Suite' },
  },
  folioItems: [
    { concept: 'Room Charge', amount: 172.41, category: 'room', date: '2025-01-10' },
    { concept: 'Minibar', amount: 27.59, category: 'minibar', date: '2025-01-11' },
  ],
};

const mockReceiptData = {
  hotel: { name: 'Test Hotel', currency: 'USD' },
  payment: {
    amount: 100,
    method: 'card',
    reference: 'REF-001',
    createdAt: '2025-01-15T10:00:00Z',
  },
  booking: {
    code: 'BK-ABC123',
    guest: { firstName: 'Juan', lastName: 'Perez' },
  },
};

describe('generateInvoicePDF', () => {
  it('returns a jsPDF instance', () => {
    const doc = generateInvoicePDF(mockInvoiceData);
    expect(doc).toBeDefined();
    expect(typeof doc.output).toBe('function');
  });

  it('returns Buffer data', () => {
    const doc = generateInvoicePDF(mockInvoiceData);
    const buffer = doc.output('arraybuffer');
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('generates PDF for cancelled invoice', () => {
    const data = {
      ...mockInvoiceData,
      invoice: { ...mockInvoiceData.invoice, cancelled: true, cancelReason: 'Error' },
    };
    const doc = generateInvoicePDF(data);
    const buffer = doc.output('arraybuffer');
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('generates PDF with no folio items (uses room line)', () => {
    const data = { ...mockInvoiceData, folioItems: [] };
    const doc = generateInvoicePDF(data);
    const buffer = doc.output('arraybuffer');
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});

describe('generateReceiptPDF', () => {
  it('returns a jsPDF instance', () => {
    const doc = generateReceiptPDF(mockReceiptData);
    expect(doc).toBeDefined();
    expect(typeof doc.output).toBe('function');
  });

  it('returns Buffer data', () => {
    const doc = generateReceiptPDF(mockReceiptData);
    const buffer = doc.output('arraybuffer');
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('generates PDF for different payment methods', () => {
    const data = {
      ...mockReceiptData,
      payment: { ...mockReceiptData.payment, method: 'cash', reference: '' },
    };
    const doc = generateReceiptPDF(data);
    const buffer = doc.output('arraybuffer');
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
