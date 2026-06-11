import { prisma } from "@/lib/prisma";
import { resolveHotelId } from "@/lib/rbac";

const clients: Set<WritableStreamDefaultWriter> = new Set();

async function getDashboardSummary(hotelId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalRooms, occupiedRooms, todayCheckins, todayCheckouts, cashMoves, todayNewBookings] =
    await Promise.all([
      prisma.room.count({ where: { hotelId } }),
      prisma.room.count({ where: { hotelId, status: "occupied" } }),
      prisma.booking.count({
        where: { hotelId, checkIn: { gte: today, lt: tomorrow }, status: { in: ["confirmed", "checked-in"] } },
      }),
      prisma.booking.count({
        where: { hotelId, checkOut: { gte: today, lt: tomorrow }, status: "checked-in" },
      }),
      prisma.cashMove.findMany({ where: { hotelId, createdAt: { gte: today } } }),
      prisma.booking.count({
        where: { hotelId, createdAt: { gte: today, lt: tomorrow }, status: { in: ["confirmed", "checked-in"] } },
      }),
    ]);

  const todayRevenue = cashMoves.filter((m) => m.type === "income").reduce((s, m) => s + m.amount, 0);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return {
    occupancyRate,
    todayCheckins,
    todayCheckouts,
    todayRevenue,
    newBookings: todayNewBookings,
  };
}

function sendToAll(data: string) {
  for (const writer of clients) {
    const encoder = new TextEncoder();
    writer.write(encoder.encode(data)).catch(() => {
      clients.delete(writer);
    });
  }
}

export async function GET(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return new Response("No hotel", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  clients.add(writer);

  const signal = new AbortController();
  const interval = setInterval(async () => {
    const summary = await getDashboardSummary(hotelId);
    if (summary) {
      sendToAll(`data: ${JSON.stringify(summary)}\n\n`);
    }
  }, 30000);

  const keepAlive = setInterval(() => {
    const w = writer as WritableStreamDefaultWriter<Uint8Array>;
    w.write(encoder.encode(": keepalive\n\n")).catch(() => {
      clients.delete(writer);
      clearInterval(keepAlive);
      clearInterval(interval);
      signal.abort();
    });
  }, 15000);

  signal.signal.addEventListener("abort", () => {
    clearInterval(interval);
    clearInterval(keepAlive);
    clients.delete(writer);
  });

  const summary = await getDashboardSummary(hotelId);
  if (summary) {
    writer.write(encoder.encode(`data: ${JSON.stringify(summary)}\n\n`)).catch(() => {});
  }

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return new Response("No hotel", { status: 404 });
  const summary = await getDashboardSummary(hotelId);
  if (summary) {
    sendToAll(`data: ${JSON.stringify(summary)}\n\n`);
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
