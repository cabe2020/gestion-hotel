import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../prisma';
import { createNotification, notifyRole } from '../notifications';

const mockedPrisma = vi.mocked(prisma);

describe('createNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a notification with required fields', async () => {
    const mockResult = { id: 'notif-1', userId: 'user-1', title: 'Test', message: 'Hello', type: 'info', hotelId: null, read: false, createdAt: new Date() };
    mockedPrisma.notification.create.mockResolvedValue(mockResult as any);

    const result = await createNotification({
      userId: 'user-1',
      title: 'Test',
      message: 'Hello',
    });

    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', title: 'Test', message: 'Hello', type: 'info', hotelId: undefined },
    });
    expect(result).toEqual(mockResult);
  });

  it('creates a notification with custom type and hotelId', async () => {
    mockedPrisma.notification.create.mockResolvedValue({} as any);

    await createNotification({
      userId: 'user-1',
      title: 'Alert',
      message: 'Check-in',
      type: 'warning',
      hotelId: 'hotel-1',
    });

    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', title: 'Alert', message: 'Check-in', type: 'warning', hotelId: 'hotel-1' },
    });
  });
});

describe('notifyRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends notifications to all active users with the given role', async () => {
    const users = [
      { id: 'user-1', name: 'Admin 1', role: 'admin', active: true, hotelId: 'hotel-1' },
      { id: 'user-2', name: 'Admin 2', role: 'admin', active: true, hotelId: 'hotel-1' },
    ];
    mockedPrisma.user.findMany.mockResolvedValue(users as any);
    mockedPrisma.notification.create.mockResolvedValue({} as any);

    await notifyRole({
      role: 'admin',
      hotelId: 'hotel-1',
      title: 'New Booking',
      message: 'A new booking was created',
    });

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'admin', active: true, hotelId: 'hotel-1' },
    });
    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(2);
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', title: 'New Booking', message: 'A new booking was created', type: 'info', hotelId: 'hotel-1' },
    });
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'user-2', title: 'New Booking', message: 'A new booking was created', type: 'info', hotelId: 'hotel-1' },
    });
  });

  it('sends no notifications when no users found', async () => {
    mockedPrisma.user.findMany.mockResolvedValue([]);

    await notifyRole({
      role: 'admin',
      hotelId: 'hotel-1',
      title: 'Test',
      message: 'Test',
    });

    expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('passes custom type to notifications', async () => {
    mockedPrisma.user.findMany.mockResolvedValue([{ id: 'u1', name: 'A', role: 'admin', active: true, hotelId: 'h1' }] as any);
    mockedPrisma.notification.create.mockResolvedValue({} as any);

    await notifyRole({
      role: 'admin',
      hotelId: 'h1',
      title: 'Alert',
      message: 'Urgent',
      type: 'urgent',
    });

    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'u1', title: 'Alert', message: 'Urgent', type: 'urgent', hotelId: 'h1' },
    });
  });
});
