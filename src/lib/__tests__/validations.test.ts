import { describe, it, expect } from 'vitest';
import {
  hotelSchema,
  roomTypeSchema,
  roomSchema,
  guestSchema,
  bookingSchema,
  paymentSchema,
  cashMoveSchema,
  invoiceSchema,
  housekeepingSchema,
  ratePlanSchema,
  guestTagSchema,
  folioItemSchema,
  upsellSchema,
  updateUserSchema,
} from '../validations';

describe('hotelSchema', () => {
  it('validates valid data', () => {
    const result = hotelSchema.safeParse({
      name: 'Hotel Test',
      address: '123 Main St',
      phone: '555-1234',
      email: 'test@hotel.com',
      currency: 'USD',
      taxRate: 16,
    });
    expect(result.success).toBe(true);
  });

  it('fails with missing name', () => {
    const result = hotelSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Nombre requerido');
    }
  });

  it('fails with invalid taxRate (negative)', () => {
    const result = hotelSchema.safeParse({ name: 'Hotel', taxRate: -5 });
    expect(result.success).toBe(false);
  });

  it('applies defaults for optional fields', () => {
    const result = hotelSchema.parse({ name: 'Hotel' });
    expect(result.currency).toBe('USD');
    expect(result.taxRate).toBe(0);
    expect(result.address).toBe('');
  });

  it('fails with invalid email', () => {
    const result = hotelSchema.safeParse({ name: 'Hotel', email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('roomTypeSchema', () => {
  it('validates valid data', () => {
    const result = roomTypeSchema.safeParse({
      name: 'Suite',
      code: 'STE',
      basePrice: 150,
      capacity: 2,
    });
    expect(result.success).toBe(true);
  });

  it('fails with missing name', () => {
    const result = roomTypeSchema.safeParse({ name: '', code: 'STE', basePrice: 100, capacity: 2 });
    expect(result.success).toBe(false);
  });

  it('fails with negative basePrice', () => {
    const result = roomTypeSchema.safeParse({ name: 'Suite', code: 'STE', basePrice: -10, capacity: 2 });
    expect(result.success).toBe(false);
  });

  it('fails with capacity less than 1', () => {
    const result = roomTypeSchema.safeParse({ name: 'Suite', code: 'STE', basePrice: 100, capacity: 0 });
    expect(result.success).toBe(false);
  });
});

describe('roomSchema', () => {
  it('validates valid data', () => {
    const result = roomSchema.safeParse({
      number: '101',
      floor: 1,
      roomTypeId: 'type-1',
    });
    expect(result.success).toBe(true);
  });

  it('fails with missing number', () => {
    const result = roomSchema.safeParse({ number: '', roomTypeId: 'type-1' });
    expect(result.success).toBe(false);
  });

  it('fails with invalid floor (negative)', () => {
    const result = roomSchema.safeParse({ number: '101', floor: -1, roomTypeId: 'type-1' });
    expect(result.success).toBe(false);
  });

  it('defaults status to available', () => {
    const result = roomSchema.parse({ number: '101', roomTypeId: 'type-1' });
    expect(result.status).toBe('available');
  });

  it('fails with invalid status', () => {
    const result = roomSchema.safeParse({ number: '101', roomTypeId: 'type-1', status: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('guestSchema', () => {
  it('validates valid data', () => {
    const result = guestSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@test.com',
    });
    expect(result.success).toBe(true);
  });

  it('fails with missing firstName', () => {
    const result = guestSchema.safeParse({ firstName: '', lastName: 'Perez' });
    expect(result.success).toBe(false);
  });

  it('fails with missing lastName', () => {
    const result = guestSchema.safeParse({ firstName: 'Juan', lastName: '' });
    expect(result.success).toBe(false);
  });

  it('defaults optional fields', () => {
    const result = guestSchema.parse({ firstName: 'Juan', lastName: 'Perez' });
    expect(result.email).toBe('');
    expect(result.phone).toBe('');
    expect(result.nationality).toBe('');
  });
});

describe('bookingSchema', () => {
  const validBooking = {
    guestId: 'guest-1',
    roomId: 'room-1',
    checkIn: '2025-01-01',
    checkOut: '2025-01-03',
    adults: 2,
    children: 0,
    roomRate: 100,
    totalNights: 2,
    totalAmount: 200,
  };

  it('validates valid data', () => {
    const result = bookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it('validates checkOut before checkIn (schema allows it, business logic handles)', () => {
    const data = { ...validBooking, checkOut: '2024-12-30', checkIn: '2025-01-01' };
    const result = bookingSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('fails with adults less than 1', () => {
    const result = bookingSchema.safeParse({ ...validBooking, adults: 0 });
    expect(result.success).toBe(false);
  });

  it('fails with negative totalAmount', () => {
    const result = bookingSchema.safeParse({ ...validBooking, totalAmount: -100 });
    expect(result.success).toBe(false);
  });

  it('defaults optional fields', () => {
    const result = bookingSchema.parse({
      guestId: 'g1',
      roomId: 'r1',
      checkIn: '2025-01-01',
      checkOut: '2025-01-03',
      roomRate: 100,
      totalNights: 2,
      totalAmount: 200,
    });
    expect(result.adults).toBe(1);
    expect(result.children).toBe(0);
    expect(result.source).toBe('direct');
    expect(result.status).toBe('confirmed');
  });
});

describe('paymentSchema', () => {
  it('validates valid data', () => {
    const result = paymentSchema.safeParse({
      bookingId: 'booking-1',
      amount: 100,
      method: 'cash',
    });
    expect(result.success).toBe(true);
  });

  it('fails with negative amount below min', () => {
    const result = paymentSchema.safeParse({
      bookingId: 'booking-1',
      amount: -2000000,
      method: 'cash',
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid method', () => {
    const result = paymentSchema.safeParse({
      bookingId: 'booking-1',
      amount: 100,
      method: 'bitcoin',
    });
    expect(result.success).toBe(false);
  });

  it('allows refund method', () => {
    const result = paymentSchema.safeParse({
      bookingId: 'booking-1',
      amount: -50,
      method: 'refund',
    });
    expect(result.success).toBe(true);
  });
});

describe('cashMoveSchema', () => {
  it('validates valid data', () => {
    const result = cashMoveSchema.safeParse({
      type: 'income',
      category: 'room-revenue',
      amount: 100,
      concept: 'Room charge',
    });
    expect(result.success).toBe(true);
  });

  it('fails with invalid type', () => {
    const result = cashMoveSchema.safeParse({
      type: 'invalid',
      category: 'room-revenue',
      amount: 100,
      concept: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('fails with zero amount', () => {
    const result = cashMoveSchema.safeParse({
      type: 'income',
      category: 'room-revenue',
      amount: 0,
      concept: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('defaults method to cash', () => {
    const result = cashMoveSchema.parse({
      type: 'expense',
      category: 'supplies',
      amount: 50,
      concept: 'Towels',
    });
    expect(result.method).toBe('cash');
  });
});

describe('invoiceSchema', () => {
  it('validates valid data', () => {
    const result = invoiceSchema.safeParse({
      number: 'FAC-202501-0001',
      bookingId: 'booking-1',
      hotelId: 'hotel-1',
      total: 200,
    });
    expect(result.success).toBe(true);
  });

  it('fails with missing number', () => {
    const result = invoiceSchema.safeParse({
      number: '',
      bookingId: 'b1',
      hotelId: 'h1',
      total: 100,
    });
    expect(result.success).toBe(false);
  });

  it('fails with negative total', () => {
    const result = invoiceSchema.safeParse({
      number: 'FAC-001',
      bookingId: 'b1',
      hotelId: 'h1',
      total: -10,
    });
    expect(result.success).toBe(false);
  });

  it('defaults status to pending', () => {
    const result = invoiceSchema.parse({
      number: 'FAC-001',
      bookingId: 'b1',
      hotelId: 'h1',
      total: 100,
    });
    expect(result.status).toBe('pending');
  });
});

describe('housekeepingSchema', () => {
  it('validates valid data', () => {
    const result = housekeepingSchema.safeParse({
      roomId: 'room-1',
    });
    expect(result.success).toBe(true);
  });

  it('fails with invalid type', () => {
    const result = housekeepingSchema.safeParse({
      roomId: 'room-1',
      type: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('defaults type to cleaning', () => {
    const result = housekeepingSchema.parse({ roomId: 'room-1' });
    expect(result.type).toBe('cleaning');
  });

  it('defaults priority to normal', () => {
    const result = housekeepingSchema.parse({ roomId: 'room-1' });
    expect(result.priority).toBe('normal');
  });
});

describe('ratePlanSchema', () => {
  it('validates valid data', () => {
    const result = ratePlanSchema.safeParse({
      name: 'High Season',
      roomTypeId: 'type-1',
      startDate: '2025-06-01',
      endDate: '2025-08-31',
      price: 200,
    });
    expect(result.success).toBe(true);
  });

  it('schema allows endDate before startDate (business logic handles)', () => {
    const result = ratePlanSchema.safeParse({
      name: 'Bad Plan',
      roomTypeId: 'type-1',
      startDate: '2025-08-01',
      endDate: '2025-06-01',
      price: 200,
    });
    expect(result.success).toBe(true);
  });

  it('fails with negative price', () => {
    const result = ratePlanSchema.safeParse({
      name: 'Plan',
      roomTypeId: 'type-1',
      startDate: '2025-06-01',
      endDate: '2025-08-31',
      price: -50,
    });
    expect(result.success).toBe(false);
  });

  it('defaults minStay to 1', () => {
    const result = ratePlanSchema.parse({
      name: 'Plan',
      roomTypeId: 'type-1',
      startDate: '2025-06-01',
      endDate: '2025-08-31',
      price: 100,
    });
    expect(result.minStay).toBe(1);
  });
});

describe('guestTagSchema', () => {
  it('validates valid data', () => {
    const result = guestTagSchema.safeParse({ name: 'VIP' });
    expect(result.success).toBe(true);
  });

  it('fails with missing name', () => {
    const result = guestTagSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('defaults color to blue', () => {
    const result = guestTagSchema.parse({ name: 'VIP' });
    expect(result.color).toBe('blue');
  });
});

describe('folioItemSchema', () => {
  it('validates valid data', () => {
    const result = folioItemSchema.safeParse({
      bookingId: 'booking-1',
      concept: 'Minibar',
      amount: 25,
    });
    expect(result.success).toBe(true);
  });

  it('fails with negative amount', () => {
    const result = folioItemSchema.safeParse({
      bookingId: 'booking-1',
      concept: 'Minibar',
      amount: -10,
    });
    expect(result.success).toBe(false);
  });

  it('defaults category to other', () => {
    const result = folioItemSchema.parse({
      bookingId: 'b1',
      concept: 'Item',
      amount: 10,
    });
    expect(result.category).toBe('other');
  });
});

describe('upsellSchema', () => {
  it('validates valid data', () => {
    const result = upsellSchema.safeParse({
      name: 'Late Checkout',
      price: 50,
    });
    expect(result.success).toBe(true);
  });

  it('fails with negative price', () => {
    const result = upsellSchema.safeParse({
      name: 'Late Checkout',
      price: -10,
    });
    expect(result.success).toBe(false);
  });

  it('defaults category to other and active to true', () => {
    const result = upsellSchema.parse({ name: 'Spa', price: 100 });
    expect(result.category).toBe('other');
    expect(result.active).toBe(true);
  });
});

describe('updateUserSchema', () => {
  it('validates valid data', () => {
    const result = updateUserSchema.safeParse({
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('fails with invalid role', () => {
    const result = updateUserSchema.safeParse({
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid email', () => {
    const result = updateUserSchema.safeParse({
      email: 'not-email',
    });
    expect(result.success).toBe(false);
  });

  it('allows partial updates', () => {
    const result = updateUserSchema.safeParse({ active: false });
    expect(result.success).toBe(true);
  });
});
