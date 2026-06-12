import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveHotelId } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

    let startDate: Date;
    let endDate: Date;

    if (period === 'year') {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    } else {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);
    }

    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      totalExpenses,
      bookingsBySource,
      occupancyByDay,
      avgNights,
      topRooms,
    ] = await Promise.all([
      prisma.booking.count({
        where: { hotelId, createdAt: { gte: startDate, lt: endDate } },
      }),
      prisma.booking.count({
        where: {
          hotelId,
          status: { in: ['checked-out', 'checked-in'] },
          createdAt: { gte: startDate, lt: endDate },
        },
      }),
      prisma.booking.count({
        where: { hotelId, status: 'cancelled', createdAt: { gte: startDate, lt: endDate } },
      }),
      prisma.cashMove.aggregate({
        where: { hotelId, type: 'income', createdAt: { gte: startDate, lt: endDate } },
        _sum: { amount: true },
      }),
      prisma.cashMove.aggregate({
        where: { hotelId, type: 'expense', createdAt: { gte: startDate, lt: endDate } },
        _sum: { amount: true },
      }),
      prisma.booking.groupBy({
        by: ['source'],
        where: { hotelId, createdAt: { gte: startDate, lt: endDate } },
        _count: { source: true },
      }),
      (async () => {
        const days: { date: string; occupancy: number; available: number }[] = [];
        const totalRooms = await prisma.room.count({ where: { hotelId } });
        let current = new Date(startDate);
        while (current < endDate) {
          const next = new Date(current);
          next.setDate(next.getDate() + 1);
          const occupied = await prisma.booking.count({
            where: {
              hotelId,
              status: { in: ['confirmed', 'checked-in'] },
              checkIn: { lt: next },
              checkOut: { gt: current },
            },
          });
          days.push({
            date: current.toISOString().split('T')[0],
            occupancy: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0,
            available: totalRooms - occupied,
          });
          current = next;
        }
        return days;
      })(),
      prisma.booking.aggregate({
        where: { hotelId, createdAt: { gte: startDate, lt: endDate } },
        _avg: { totalNights: true },
      }),
      prisma.booking.groupBy({
        by: ['roomId'],
        where: { hotelId, roomId: { not: null }, createdAt: { gte: startDate, lt: endDate } },
        _count: { roomId: true },
        _sum: { totalAmount: true },
        orderBy: { _count: { roomId: 'desc' } },
        take: 10,
      }),
    ]);

    const roomIds = topRooms.filter((r) => r.roomId).map((r) => r.roomId!);
    const rooms =
      roomIds.length > 0
        ? await prisma.room.findMany({
            where: { id: { in: roomIds } },
            select: { id: true, number: true, roomType: { select: { name: true } } },
          })
        : [];
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const cancellationRate =
      totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;

    return NextResponse.json({
      period,
      totalBookings,
      completedBookings,
      cancelledBookings,
      cancellationRate,
      totalRevenue: totalRevenue._sum.amount || 0,
      totalExpenses: totalExpenses._sum.amount || 0,
      netRevenue: (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0),
      avgNights: avgNights._avg.totalNights || 0,
      bookingsBySource: bookingsBySource.map((s) => ({ source: s.source, count: s._count.source })),
      occupancyByDay,
      topRooms: topRooms
        .filter((r) => r.roomId)
        .map((r) => ({
          roomNumber: roomMap.get(r.roomId!)?.number || 'N/A',
          roomType: roomMap.get(r.roomId!)?.roomType?.name || '',
          bookings: r._count.roomId,
          revenue: r._sum.totalAmount || 0,
        })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
