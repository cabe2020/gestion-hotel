import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../prisma';
import { logAction } from '../audit';

const mockedPrisma = vi.mocked(prisma);

describe('logAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an audit log with all fields', async () => {
    const mockResult = { id: 'log-1', userId: 'user-1', action: 'CREATE', entity: 'Booking', entityId: 'b1', details: 'Created booking', hotelId: 'hotel-1', createdAt: new Date() };
    mockedPrisma.auditLog.create.mockResolvedValue(mockResult as any);

    const result = await logAction({
      userId: 'user-1',
      action: 'CREATE',
      entity: 'Booking',
      entityId: 'b1',
      details: 'Created booking',
      hotelId: 'hotel-1',
    });

    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', action: 'CREATE', entity: 'Booking', entityId: 'b1', details: 'Created booking', hotelId: 'hotel-1' },
    });
    expect(result).toEqual(mockResult);
  });

  it('creates an audit log with minimal fields', async () => {
    mockedPrisma.auditLog.create.mockResolvedValue({} as any);

    await logAction({
      action: 'DELETE',
      entity: 'Room',
    });

    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { userId: undefined, action: 'DELETE', entity: 'Room', entityId: '', details: '', hotelId: undefined },
    });
  });

  it('uses default values for optional fields', async () => {
    mockedPrisma.auditLog.create.mockResolvedValue({} as any);

    await logAction({
      action: 'UPDATE',
      entity: 'Guest',
      entityId: 'g1',
    });

    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { userId: undefined, action: 'UPDATE', entity: 'Guest', entityId: 'g1', details: '', hotelId: undefined },
    });
  });
});
