import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBookingCode } from "@/lib/utils";
import { sendEmail, bookingConfirmationHtml } from "@/lib/email";
import { z } from "zod";
import { ZodError } from "zod";

const bookingEngineSchema = z.object({
  guest: z.object({
    firstName: z.string().min(1, "Nombre requerido"),
    lastName: z.string().min(1, "Apellido requerido"),
    email: z.string().email("Email invalido"),
    phone: z.string().min(1, "Telefono requerido"),
    idNumber: z.string().min(1, "Numero de identidad requerido"),
    nationality: z.string().optional().default(""),
  }),
  checkIn: z.string(),
  checkOut: z.string(),
  roomTypeId: z.string().min(1, "Tipo de habitacion requerido"),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  specialRequests: z.string().optional().default(""),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = bookingEngineSchema.parse(body);

    const hotel = await prisma.hotel.findFirst();
    if (!hotel) {
      return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
    }

    const checkInDate = new Date(data.checkIn);
    const checkOutDate = new Date(data.checkOut);

    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: "La fecha de check-out debe ser posterior a la de check-in" },
        { status: 400 }
      );
    }

    const roomType = await prisma.roomType.findUnique({
      where: { id: data.roomTypeId },
      include: {
        rooms: true,
        ratePlans: {
          where: {
            startDate: { lte: checkOutDate },
            endDate: { gte: checkInDate },
          },
          orderBy: { price: "asc" },
        },
      },
    });

    if (!roomType || roomType.hotelId !== hotel.id) {
      return NextResponse.json(
        { error: "Tipo de habitacion no encontrado" },
        { status: 404 }
      );
    }

    const availableRoom = await findAvailableRoom(
      roomType.rooms.map((r) => r.id),
      checkInDate,
      checkOutDate
    );

    if (!availableRoom) {
      return NextResponse.json(
        { error: "No hay habitaciones disponibles de este tipo en las fechas seleccionadas" },
        { status: 409 }
      );
    }

    const guest = await prisma.guest.upsert({
      where: {
        hotelId_idNumber: {
          hotelId: hotel.id,
          idNumber: data.guest.idNumber,
        },
      },
      update: {
        firstName: data.guest.firstName,
        lastName: data.guest.lastName,
        email: data.guest.email,
        phone: data.guest.phone,
        nationality: data.guest.nationality,
      },
      create: {
        firstName: data.guest.firstName,
        lastName: data.guest.lastName,
        email: data.guest.email,
        phone: data.guest.phone,
        idNumber: data.guest.idNumber,
        nationality: data.guest.nationality,
        hotelId: hotel.id,
      },
    });

    const totalNights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

	const applicableRate = roomType.ratePlans.find(
		(rp) => totalNights >= rp.minStay
	);
	const baseRate = applicableRate ? applicableRate.price : roomType.basePrice;
	const occupancySurcharge = data.adults > 1 ? baseRate * 0.15 * (data.adults - 1) : 0;
	const roomRate = baseRate + occupancySurcharge;
	const totalAmount = roomRate * totalNights;

	const occupancyNote = occupancySurcharge > 0
		? `Tarifa base: $${baseRate.toFixed(2)} + Suplemento ${data.adults - 1} persona${data.adults - 1 > 1 ? "s" : ""}: $${occupancySurcharge.toFixed(2)}/noche`
		: "";

	const booking = await prisma.booking.create({
		data: {
			code: generateBookingCode(),
			status: "confirmed",
			source: "direct",
			checkIn: checkInDate,
			checkOut: checkOutDate,
			adults: data.adults,
			children: data.children,
			roomId: availableRoom.id,
			guestId: guest.id,
			roomRate,
			totalNights,
			totalAmount,
			specialRequests: data.specialRequests,
			notes: occupancyNote,
			hotelId: hotel.id,
		},
      include: {
        guest: true,
        room: { include: { roomType: true } },
      },
    });

    try {
      await sendEmail({
        to: guest.email,
        subject: `Confirmacion de Reserva - ${booking.code} - ${hotel.name}`,
        html: bookingConfirmationHtml(booking, hotel),
      });
    } catch {
      console.error("Error enviando email de confirmacion");
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

async function findAvailableRoom(
  roomIds: string[],
  checkIn: Date,
  checkOut: Date
): Promise<{ id: string } | null> {
  const bookedRooms = await prisma.booking.findMany({
    where: {
      roomId: { in: roomIds },
      status: { in: ["confirmed", "checked-in"] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { roomId: true },
    distinct: ["roomId"],
  });

  const bookedIds = new Set(bookedRooms.map((b) => b.roomId));
  const availableId = roomIds.find((id) => !bookedIds.has(id));

  if (!availableId) return null;
  return { id: availableId };
}
