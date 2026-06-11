import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveHotelId } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: "No hotel" }, { status: 404 });

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const endDate = to ? new Date(to) : new Date();

    const [cashMoves, payments] = await Promise.all([
      prisma.cashMove.findMany({
        where: {
          hotelId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.payment.findMany({
        where: {
          booking: { hotelId },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const resultMap = new Map<string, { roomRevenue: number; folioRevenue: number; totalRevenue: number; payments: number }>();

    cashMoves.forEach((m) => {
      const d = new Date(m.createdAt);
      let key: string;
      if (period === "weekly") {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (period === "monthly") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = d.toISOString().split("T")[0];
      }

      const existing = resultMap.get(key) || { roomRevenue: 0, folioRevenue: 0, totalRevenue: 0, payments: 0 };
      if (m.type === "income") {
        if (m.category === "room-revenue") {
          existing.roomRevenue += m.amount;
        } else {
          existing.folioRevenue += m.amount;
        }
        existing.totalRevenue += m.amount;
      }
      resultMap.set(key, existing);
    });

    payments.forEach((p) => {
      const d = new Date(p.createdAt);
      let key: string;
      if (period === "weekly") {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (period === "monthly") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = d.toISOString().split("T")[0];
      }
      const existing = resultMap.get(key) || { roomRevenue: 0, folioRevenue: 0, totalRevenue: 0, payments: 0 };
      existing.payments += p.amount;
      resultMap.set(key, existing);
    });

    const result = Array.from(resultMap.entries())
      .map(([date, data]) => ({
        date,
        roomRevenue: Math.round(data.roomRevenue * 100) / 100,
        folioRevenue: Math.round(data.folioRevenue * 100) / 100,
        totalRevenue: Math.round(data.totalRevenue * 100) / 100,
        payments: Math.round(data.payments * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
