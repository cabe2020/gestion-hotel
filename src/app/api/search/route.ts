import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveHotelId } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    if (!q.trim()) {
      return NextResponse.json({ huespedes: [], reservas: [], habitaciones: [] });
    }

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json({ huespedes: [], reservas: [], habitaciones: [] });
    }

    const search = q.trim();

    const guests = await prisma.guest.findMany({
      where: {
        hotelId,
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { idNumber: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, idNumber: true },
      take: 5,
    });

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { guest: { firstName: { contains: search, mode: "insensitive" } } },
          { guest: { lastName: { contains: search, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        code: true,
        status: true,
        checkIn: true,
        checkOut: true,
        guest: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    });

    const rooms = await prisma.room.findMany({
      where: {
        hotelId,
        number: { contains: search, mode: "insensitive" } },
      select: {
        id: true,
        number: true,
        status: true,
        roomType: { select: { name: true } },
      },
      take: 5,
    });

    return NextResponse.json({
      huespedes: guests.map((g) => ({
        id: g.id,
        label: `${g.firstName} ${g.lastName}`,
        subtitle: g.email || g.idNumber || "Sin datos",
        href: `/guests/${g.id}`,
      })),
      reservas: bookings.map((b) => ({
        id: b.id,
        label: b.code,
        subtitle: `${b.guest.firstName} ${b.guest.lastName}`,
        href: `/bookings`,
      })),
      habitaciones: rooms.map((r) => ({
        id: r.id,
        label: `Hab. ${r.number}`,
        subtitle: `${r.roomType.name} - ${r.status}`,
        href: `/rooms`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
