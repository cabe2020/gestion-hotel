import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatDate,
  generateBookingCode,
  generateInvoiceNumber,
  bookingStatuses,
  roomStatuses,
  paymentMethods,
  bookingSources,
  cashCategories,
} from '../utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });
});

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    const result = formatCurrency(100);
    expect(result).toContain('100');
  });

  it('formats with custom currency', () => {
    const result = formatCurrency(50, 'EUR');
    expect(result).toContain('50');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date(2025, 0, 15);
    const result = formatDate(date);
    expect(result).toBe('15/01/2025');
  });

  it('formats a date string', () => {
    const result = formatDate('2025-06-10T12:00:00');
    expect(result).toContain('2025');
  });

  it('returns a string with expected format pattern', () => {
    const date = new Date(2025, 5, 10);
    const result = formatDate(date);
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('generateBookingCode', () => {
  it('starts with BK-', () => {
    const code = generateBookingCode();
    expect(code).toMatch(/^BK-/);
  });

  it('has 9 characters total', () => {
    const code = generateBookingCode();
    expect(code.length).toBe(9);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateBookingCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('generateInvoiceNumber', () => {
  it('starts with FAC-', () => {
    const num = generateInvoiceNumber();
    expect(num).toMatch(/^FAC-/);
  });

  it('contains year and month', () => {
    const num = generateInvoiceNumber();
    expect(num).toMatch(/^FAC-\d{6}-/);
  });
});

describe('constants', () => {
  it('bookingStatuses has 5 entries', () => {
    expect(bookingStatuses).toHaveLength(5);
  });

  it('roomStatuses has 5 entries', () => {
    expect(roomStatuses).toHaveLength(5);
  });

  it('paymentMethods has 5 entries', () => {
    expect(paymentMethods).toHaveLength(5);
  });

  it('bookingSources has 8 entries', () => {
    expect(bookingSources).toHaveLength(8);
  });

  it('cashCategories has 9 entries', () => {
    expect(cashCategories).toHaveLength(9);
  });

  it('cashCategories has both income and expense types', () => {
    const types = new Set(cashCategories.map((c) => c.type));
    expect(types.has('income')).toBe(true);
    expect(types.has('expense')).toBe(true);
  });
});
