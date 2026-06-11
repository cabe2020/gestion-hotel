import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roomSchema } from "@/lib/validations";
import { getUserFromHeaders } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { ZodError } from "zod";

export async function GET() {
  try {
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) return NextResponse.json([]);

    const rooms = await prisma.room.findMany({
      where: { hotelId: hotel.id },
      include: {
        roomType: true,
        bookings: {
          where: { status: { in: ["confirmed", "checked-in"] } },
          include: { guest: true },
        },
      },
      orderBy: { number: "asc" },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = roomSchema.parse(body);
    const hotel = await prisma.hotel.findFirst();
    if (!hotel)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });

    const room = await prisma.room.create({
      data: { ...data, hotelId: hotel.id },
      include: { roomType: true },
    });

    await logAction({
      userId: getUserFromHeaders(request).id,
      action: "create",
      entity: "room",
      entityId: room.id,
      details: `Habitacion ${room.number} creada`,
      hotelId: hotel.id,
    }).catch(() => {});

    return NextResponse.json(room, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
