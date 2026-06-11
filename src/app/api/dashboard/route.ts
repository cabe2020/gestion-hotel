import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hotel = await prisma.hotel.findFirst();
    if (!hotel)
      return NextResponse.json({ error: "No hotel found" }, { status: 404 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 1);

    const sameDayLastWeek = new Date(today);
    sameDayLastWeek.setDate(sameDayLastWeek.getDate() - 7);
    const sameDayNextWeek = new Date(sameDayLastWeek);
    sameDayNextWeek.setDate(sameDayNextWeek.getDate() + 1);

    const prevWeekStart = new Date(today);
    prevWeekStart.setDate(prevWeekStart.getDate() - 14);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 7);

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
    ] = await Promise.all([
      prisma.room.count({ where: { hotelId: hotel.id } }),
      prisma.room.count({
        where: { hotelId: hotel.id, status: "occupied" },
      }),
      prisma.booking.count({
        where: {
          hotelId: hotel.id,
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ["confirmed", "checked-in"] },
        },
      }),
      prisma.booking.count({
        where: {
          hotelId: hotel.id,
          checkOut: { gte: today, lt: tomorrow },
          status: "checked-in",
        },
      }),
      prisma.guest.count({ where: { hotelId: hotel.id } }),
      prisma.booking.count({
        where: { hotelId: hotel.id, status: { in: ["confirmed", "checked-in"] } },
      }),
      prisma.booking.findMany({
        where: { hotelId: hotel.id },
        include: { guest: true, room: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.cashMove.findMany({
        where: { hotelId: hotel.id, createdAt: { gte: today } },
      }),
      prisma.room.count({
        where: {
          hotelId: hotel.id,
          status: "occupied",
          createdAt: { lt: lastWeekStart },
        },
      }),
      prisma.cashMove.findMany({
        where: {
          hotelId: hotel.id,
          createdAt: { gte: sameDayLastWeek, lt: sameDayNextWeek },
        },
      }),
      prisma.booking.count({
        where: {
          hotelId: hotel.id,
          createdAt: { gte: yesterday, lt: today },
          status: { in: ["confirmed", "checked-in"] },
        },
      }),
      prisma.booking.findMany({
        where: {
          hotelId: hotel.id,
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ["confirmed", "checked-in"] },
        },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, phone: true } },
          room: { select: { id: true, number: true, roomType: { select: { name: true } } } },
        },
        orderBy: { checkIn: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          hotelId: hotel.id,
          checkOut: { gte: today, lt: tomorrow },
          status: "checked-in",
        },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, phone: true } },
          room: { select: { id: true, number: true, roomType: { select: { name: true } } } },
        },
        orderBy: { checkOut: "asc" },
      }),
      prisma.notification.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const todayRevenue = cashMoves
      .filter((m) => m.type === "income")
      .reduce((s, m) => s + m.amount, 0);
    const todayExpenses = cashMoves
      .filter((m) => m.type === "expense")
      .reduce((s, m) => s + m.amount, 0);

    const sameDayLastWeekRevenue = sameDayLastWeekCashMoves
      .filter((m) => m.type === "income")
      .reduce((s, m) => s + m.amount, 0);

    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const prevWeekOccupancyRate =
      totalRooms > 0
        ? Math.round((prevWeekOccupiedRooms / totalRooms) * 100)
        : 0;

    const todayNewBookings = await prisma.booking.count({
      where: {
        hotelId: hotel.id,
        createdAt: { gte: today, lt: tomorrow },
        status: { in: ["confirmed", "checked-in"] },
      },
    });

    const occupancyDiff =
      prevWeekOccupancyRate > 0
        ? Math.round(
            ((occupancyRate - prevWeekOccupancyRate) / prevWeekOccupancyRate) *
              100
          )
        : 0;

    const revenueDiff =
      sameDayLastWeekRevenue > 0
        ? Math.round(
            ((todayRevenue - sameDayLastWeekRevenue) /
              sameDayLastWeekRevenue) *
              100
          )
        : 0;

    const revenueAmountDiff = todayRevenue - sameDayLastWeekRevenue;

    const bookingsDiff = todayNewBookings - yesterdayBookingsCount;

    const roomsByStatus = await prisma.room.groupBy({
      by: ["status"],
      where: { hotelId: hotel.id },
      _count: { status: true },
    });

    const last7Days: { date: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayMoves = await prisma.cashMove.findMany({
        where: { hotelId: hotel.id, createdAt: { gte: d, lt: nextD } },
      });
      last7Days.push({
        date: d.toISOString().split("T")[0],
        income: dayMoves
          .filter((m) => m.type === "income")
          .reduce((s, m) => s + m.amount, 0),
        expense: dayMoves
          .filter((m) => m.type === "expense")
          .reduce((s, m) => s + m.amount, 0),
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
      currency: hotel.currency,
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
