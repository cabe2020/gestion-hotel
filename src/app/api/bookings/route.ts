import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBookingCode, formatDate } from "@/lib/utils";
import { bookingSchema } from "@/lib/validations";
import { getUserFromHeaders } from "@/lib/rbac";
import { notifyRole } from "@/lib/notifications";
import { logAction } from "@/lib/audit";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const hotel = await prisma.hotel.findFirst();
  if (!hotel) return NextResponse.json({ data: [], total: 0, page: 1, totalPages: 0 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { hotelId: hotel.id },
      include: {
        guest: true,
        room: { include: { roomType: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where: { hotelId: hotel.id } }),
  ]);
  return NextResponse.json({
    data: bookings,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    const body = await request.json();
    const data = bookingSchema.parse(body);
    const hotel = await prisma.hotel.findFirst();
    if (!hotel)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });

    const conflict = await prisma.booking.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: ["confirmed", "checked-in"] },
        checkIn: { lt: new Date(data.checkOut) },
        checkOut: { gt: new Date(data.checkIn) },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "La habitacion ya tiene una reserva en esas fechas" },
        { status: 409 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
      include: { roomType: true },
    });

    const activeRatePlan = room
      ? await prisma.ratePlan.findFirst({
          where: {
            roomTypeId: room.roomTypeId,
            startDate: { lte: new Date(data.checkIn) },
            endDate: { gte: new Date(data.checkOut) },
            hotelId: hotel.id,
          },
          orderBy: { price: "asc" },
        })
      : null;

	let effectiveRate = activeRatePlan ? activeRatePlan.price : data.roomRate;
	const baseRate = effectiveRate;
	const occupancySurcharge = data.adults > 1 ? baseRate * 0.15 * (data.adults - 1) : 0;
	effectiveRate = baseRate + occupancySurcharge;
	const effectiveTotal = effectiveRate * data.totalNights;

	const occupancyNote = occupancySurcharge > 0
		? ` | Tarifa base: $${baseRate.toFixed(2)} + Suplemento ${data.adults - 1} persona${data.adults - 1 > 1 ? "s" : ""}: $${occupancySurcharge.toFixed(2)}/noche`
		: "";
	const combinedNotes = (data.notes || "") + occupancyNote;

	const booking = await prisma.booking.create({
		data: {
			guestId: data.guestId,
			roomId: data.roomId,
			checkIn: new Date(data.checkIn),
			checkOut: new Date(data.checkOut),
			adults: data.adults,
			children: data.children,
			roomRate: effectiveRate,
			totalNights: data.totalNights,
			totalAmount: effectiveTotal,
			paidAmount: data.paidAmount,
			source: data.source,
			notes: combinedNotes,
			status: data.status,
			code: generateBookingCode(),
			hotelId: hotel.id,
		},
      include: {
        guest: true,
        room: { include: { roomType: true } },
      },
    });

    await notifyRole({
      role: "admin",
      hotelId: hotel.id,
      title: `Nueva reserva: ${booking.code}`,
      message: `Reserva para ${booking.guest.firstName} ${booking.guest.lastName} - ${formatDate(booking.checkIn)} a ${formatDate(booking.checkOut)}`,
      type: "info",
    }).catch(() => {});

    await logAction({
      userId,
      action: "create",
      entity: "booking",
      entityId: booking.id,
      details: `Reserva ${booking.code} creada`,
      hotelId: hotel.id,
    }).catch(() => {});

    return NextResponse.json(booking, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
