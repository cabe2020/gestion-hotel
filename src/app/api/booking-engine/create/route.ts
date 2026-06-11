import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBookingCode } from "@/lib/utils";
import { sendEmail, bookingConfirmationHtml } from "@/lib/email";
import { resolveHotelId } from "@/lib/rbac";
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

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
    }

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
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

      if (!roomType || roomType.hotelId !== hotelId) {
      return NextResponse.json(
        { error: "Tipo de habitacion no encontrado" },
        { status: 404 }
      );
    }

    if (data.adults > roomType.capacity) {
      return NextResponse.json(
        { error: `Capacidad maxima de la habitacion es ${roomType.capacity} personas` },
        { status: 400 }
      );
    }

    const booking = await prisma.$transaction(async (tx) => {
      const roomIds = roomType.rooms.map((r) => r.id);

      const bookedRooms = await tx.booking.findMany({
        where: {
          roomId: { in: roomIds },
          status: { in: ["confirmed", "checked-in"] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
        select: { roomId: true },
        distinct: ["roomId"],
      });

      const bookedIds = new Set(bookedRooms.map((b) => b.roomId));
      const candidateId = roomIds.find((id) => !bookedIds.has(id));

      if (!candidateId) {
        throw new Error("No hay habitaciones disponibles de este tipo en las fechas seleccionadas");
      }

      const lockedRoom = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Room" WHERE id = ${candidateId} AND status = 'available' FOR UPDATE
      `;

      if (lockedRoom.length === 0) {
        throw new Error("La habitacion seleccionada ya no esta disponible");
      }

      const conflict = await tx.booking.findFirst({
        where: {
          roomId: candidateId,
          status: { in: ["confirmed", "checked-in"] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
      });

      if (conflict) {
        throw new Error("Conflicto de fechas detectado durante la transaccion");
      }

      const guest = await tx.guest.upsert({
        where: {
          hotelId_idNumber: {
            hotelId,
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
        hotelId,
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
        const subtotal = roomRate * totalNights;
        const taxAmount = Math.round(subtotal * (hotel.taxRate / 100) * 100) / 100;
        const totalAmount = subtotal + taxAmount;

        const occupancyNote = occupancySurcharge > 0
          ? `Tarifa base: $${baseRate.toFixed(2)} + Suplemento ${data.adults - 1} persona${data.adults - 1 > 1 ? "s" : ""}: $${occupancySurcharge.toFixed(2)}/noche`
          : "";
        const taxNote = hotel.taxRate > 0 ? ` | Impuesto (${hotel.taxRate}%): $${taxAmount.toFixed(2)}` : "";

        return tx.booking.create({
          data: {
            code: generateBookingCode(),
            status: "confirmed",
            source: "direct",
            checkIn: checkInDate,
            checkOut: checkOutDate,
            adults: data.adults,
            children: data.children,
            roomId: candidateId,
            guestId: guest.id,
            roomRate,
            totalNights,
            totalAmount,
            specialRequests: data.specialRequests,
            notes: occupancyNote + taxNote,
            hotelId,
          },
        include: {
          guest: true,
          room: { include: { roomType: true } },
        },
      });
    });

    try {
      await sendEmail({
        to: booking.guest.email,
        subject: `Confirmacion de Reserva - ${booking.code} - ${hotel.name}`,
        html: bookingConfirmationHtml(booking, hotel),
      });
    } catch {
      console.error("Error enviando email de confirmacion");
    }

    if (hotel.taxRate > 0) {
      const subtotal = booking.roomRate * booking.totalNights;
      const taxAmount = Math.round(subtotal * (hotel.taxRate / 100) * 100) / 100;
      await prisma.folioItem.create({
        data: {
          bookingId: booking.id,
          concept: `Impuesto (${hotel.taxRate}%)`,
          amount: taxAmount,
          category: "tax",
        },
      }).catch(() => {});
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("no esta disponible") ||
      message.includes("Conflicto de fechas") ||
      message.includes("No hay habitaciones disponibles")
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

