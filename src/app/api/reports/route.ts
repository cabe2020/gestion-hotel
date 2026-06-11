import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveHotelId } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: "No hotel" }, { status: 404 });

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const [bookings, cashMoves, rooms] = await Promise.all([
      prisma.booking.findMany({
        where: { hotelId: hotelId, createdAt: { gte: startDate } },
        include: { guest: true, room: { include: { roomType: true } } },
      }),
      prisma.cashMove.findMany({
        where: { hotelId: hotelId, createdAt: { gte: startDate } },
      }),
      prisma.room.findMany({
        where: { hotelId: hotelId },
      }),
    ]);

    const totalRevenue = cashMoves.filter(m => m.type === "income").reduce((s, m) => s + m.amount, 0);
    const totalExpenses = cashMoves.filter(m => m.type === "expense").reduce((s, m) => s + m.amount, 0);

    const occupiedRooms = rooms.filter(r => r.status === "occupied").length;
    const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;

    const avgRate = bookings.length > 0 ? bookings.reduce((s, b) => s + b.roomRate, 0) / bookings.length : 0;
    const revpar = rooms.length > 0 ? totalRevenue / rooms.length : 0;

    const sourceMap = new Map<string, { count: number; revenue: number }>();
    bookings.forEach(b => {
      const existing = sourceMap.get(b.source) || { count: 0, revenue: 0 };
      sourceMap.set(b.source, { count: existing.count + 1, revenue: existing.revenue + b.totalAmount });
    });
    const bookingsBySource = Array.from(sourceMap.entries()).map(([source, data]) => ({ source, ...data }));

    const statusMap = new Map<string, number>();
    bookings.forEach(b => {
      statusMap.set(b.status, (statusMap.get(b.status) || 0) + 1);
    });
    const bookingsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    cashMoves.forEach(m => {
      const d = new Date(m.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const existing = monthlyMap.get(key) || { income: 0, expense: 0 };
      if (m.type === "income") existing.income += m.amount;
      else existing.expense += m.amount;
      monthlyMap.set(key, existing);
    });
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));

    const guestMap = new Map<string, { name: string; bookings: number; totalSpent: number }>();
    bookings.forEach(b => {
      if (!b.guest) return;
      const key = b.guestId;
      const existing = guestMap.get(key) || {
        name: `${b.guest.firstName} ${b.guest.lastName}`,
        bookings: 0,
        totalSpent: 0,
      };
      existing.bookings++;
      existing.totalSpent += b.totalAmount;
      guestMap.set(key, existing);
    });
    const topGuests = Array.from(guestMap.values())
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    return NextResponse.json({
      totalBookings: bookings.length,
      totalRevenue,
      totalExpenses,
      occupancyRate,
      avgRate: Math.round(avgRate * 100) / 100,
      revpar: Math.round(revpar * 100) / 100,
      bookingsBySource,
      bookingsByStatus,
      monthlyRevenue,
      topGuests,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
