import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveHotelId } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: 'No hotel found' }, { status: 404 });

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { currency: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sameDayLastWeek = new Date(today);
    sameDayLastWeek.setDate(sameDayLastWeek.getDate() - 7);
    const sameDayNextWeek = new Date(sameDayLastWeek);
    sameDayNextWeek.setDate(sameDayNextWeek.getDate() + 1);

    const prevWeekStart = new Date(today);
    prevWeekStart.setDate(prevWeekStart.getDate() - 14);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 7);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalRooms,
      occupiedRooms,
      todayCheckins,
      todayCheckouts,
      totalGuests,
      activeBookings,
      recentBookings,
      cashMoves,
      prevWeekOccupiedRooms,
      sameDayLastWeekCashMoves,
      yesterdayBookingsCount,
      todayArrivals,
      todayDepartures,
      notifications,
      allWeekCashMoves,
    ] = await Promise.all([
      prisma.room.count({ where: { hotelId: hotelId } }),
      prisma.room.count({
        where: { hotelId: hotelId, status: 'occupied' },
      }),
      prisma.booking.count({
        where: {
          hotelId: hotelId,
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ['confirmed', 'checked-in'] },
        },
      }),
      prisma.booking.count({
        where: {
          hotelId: hotelId,
          checkOut: { gte: today, lt: tomorrow },
          status: 'checked-in',
        },
      }),
      prisma.guest.count({ where: { hotelId: hotelId } }),
      prisma.booking.count({
        where: { hotelId: hotelId, status: { in: ['confirmed', 'checked-in'] } },
      }),
      prisma.booking.findMany({
        where: { hotelId: hotelId },
        include: { guest: true, room: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.cashMove.findMany({
        where: { hotelId: hotelId, createdAt: { gte: today } },
      }),
      prisma.booking.count({
        where: {
          hotelId: hotelId,
          checkIn: { lte: prevWeekEnd },
          checkOut: { gte: prevWeekStart },
          status: { notIn: ['cancelled', 'no-show'] },
        },
      }),
      prisma.cashMove.findMany({
        where: {
          hotelId: hotelId,
          createdAt: { gte: sameDayLastWeek, lt: sameDayNextWeek },
        },
      }),
      prisma.booking.count({
        where: {
          hotelId: hotelId,
          createdAt: { gte: yesterday, lt: today },
          status: { in: ['confirmed', 'checked-in'] },
        },
      }),
      prisma.booking.findMany({
        where: {
          hotelId: hotelId,
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ['confirmed', 'checked-in'] },
        },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, phone: true } },
          room: { select: { id: true, number: true, roomType: { select: { name: true } } } },
        },
        orderBy: { checkIn: 'asc' },
      }),
      prisma.booking.findMany({
        where: {
          hotelId: hotelId,
          checkOut: { gte: today, lt: tomorrow },
          status: 'checked-in',
        },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, phone: true } },
          room: { select: { id: true, number: true, roomType: { select: { name: true } } } },
        },
        orderBy: { checkOut: 'asc' },
      }),
      prisma.notification.findMany({
        where: { hotelId: hotelId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.cashMove.findMany({
        where: { hotelId: hotelId, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const todayRevenue = cashMoves
      .filter((m) => m.type === 'income')
      .reduce((s, m) => s + m.amount, 0);
    const todayExpenses = cashMoves
      .filter((m) => m.type === 'expense')
      .reduce((s, m) => s + m.amount, 0);

    const sameDayLastWeekRevenue = sameDayLastWeekCashMoves
      .filter((m) => m.type === 'income')
      .reduce((s, m) => s + m.amount, 0);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const prevWeekOccupancyRate =
      totalRooms > 0 ? Math.round((prevWeekOccupiedRooms / totalRooms) * 100) : 0;

    const todayNewBookings = await prisma.booking.count({
      where: {
        hotelId: hotelId,
        createdAt: { gte: today, lt: tomorrow },
        status: { in: ['confirmed', 'checked-in'] },
      },
    });

    const occupancyDiff =
      prevWeekOccupancyRate > 0
        ? Math.round(((occupancyRate - prevWeekOccupancyRate) / prevWeekOccupancyRate) * 100)
        : 0;

    const revenueDiff =
      sameDayLastWeekRevenue > 0
        ? Math.round(((todayRevenue - sameDayLastWeekRevenue) / sameDayLastWeekRevenue) * 100)
        : 0;

    const revenueAmountDiff = todayRevenue - sameDayLastWeekRevenue;

    const bookingsDiff = todayNewBookings - yesterdayBookingsCount;

    const roomsByStatus = await prisma.room.groupBy({
      by: ['status'],
      where: { hotelId: hotelId },
      _count: { status: true },
    });

    const last7Days: { date: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dateStr = d.toISOString().split('T')[0];
      const dayMoves = allWeekCashMoves.filter((m) => m.createdAt >= d && m.createdAt < nextD);
      last7Days.push({
        date: dateStr,
        income: dayMoves.filter((m) => m.type === 'income').reduce((s, m) => s + m.amount, 0),
        expense: dayMoves.filter((m) => m.type === 'expense').reduce((s, m) => s + m.amount, 0),
      });
    }

    return NextResponse.json({
      totalRooms,
      occupiedRooms,
      occupancyRate,
      todayCheckins,
      todayCheckouts,
      totalGuests,
      activeBookings,
      todayRevenue,
      todayExpenses,
      recentBookings,
      roomsByStatus,
      revenueChart: last7Days,
      currency: hotel?.currency || 'USD',
      comparison: {
        occupancyDiff,
        prevWeekOccupancyRate,
        revenueDiff,
        revenueAmountDiff,
        sameDayLastWeekRevenue,
        bookingsDiff,
        yesterdayBookingsCount,
        todayNewBookings,
      },
      todayArrivals: todayArrivals.map((b) => ({
        id: b.id,
        code: b.code,
        guest: b.guest,
        room: b.room,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        adults: b.adults,
        children: b.children,
        status: b.status,
      })),
      todayDepartures: todayDepartures.map((b) => ({
        id: b.id,
        code: b.code,
        guest: b.guest,
        room: b.room,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        adults: b.adults,
        children: b.children,
        status: b.status,
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
