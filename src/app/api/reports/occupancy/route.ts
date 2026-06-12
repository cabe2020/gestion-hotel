import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveHotelId } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 404 });

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const endDate = to ? new Date(to) : new Date();

    const rooms = await prisma.room.findMany({
      where: { hotelId },
    });
    const totalRooms = rooms.length;

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        checkIn: { lte: endDate },
        checkOut: { gte: startDate },
      },
      include: { room: { include: { roomType: true } }, payments: true },
    });

    const days: {
      date: string;
      totalRooms: number;
      occupiedRooms: number;
      occupancyRate: number;
      avgRate: number;
      revenue: number;
    }[] = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayStr = current.toISOString().split('T')[0];
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const occupiedRoomIds = new Set<string>();
      let totalRevenue = 0;
      let rateSum = 0;
      let rateCount = 0;

      bookings.forEach((b) => {
        const ci = new Date(b.checkIn);
        const co = new Date(b.checkOut);
        if (ci <= dayEnd && co > dayStart) {
          if (b.roomId) occupiedRoomIds.add(b.roomId);
          totalRevenue += b.roomRate;
          rateSum += b.roomRate;
          rateCount++;
        }
      });

      const occupiedRooms = occupiedRoomIds.size;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
      const avgRate = rateCount > 0 ? Math.round((rateSum / rateCount) * 100) / 100 : 0;

      days.push({
        date: dayStr,
        totalRooms,
        occupiedRooms,
        occupancyRate,
        avgRate,
        revenue: Math.round(totalRevenue * 100) / 100,
      });
      current.setDate(current.getDate() + 1);
    }

    return NextResponse.json(days);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
