import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBookingCode, formatDate } from "@/lib/utils";
import { bookingSchema } from "@/lib/validations";
import { getUserFromHeaders, resolveHotelId } from "@/lib/rbac";
import { notifyRole } from "@/lib/notifications";
import { logAction } from "@/lib/audit";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return NextResponse.json({ data: [], total: 0, page: 1, totalPages: 0 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { hotelId },
      include: {
        guest: true,
        room: { include: { roomType: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where: { hotelId } }),
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
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const booking = await prisma.$transaction(async (tx) => {
          const lockedRoom = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Room" WHERE id = ${data.roomId} AND status = 'available' FOR UPDATE
        `;

          if (lockedRoom.length === 0) {
            throw new Error("La habitacion ya no esta disponible");
          }

          const conflict = await tx.booking.findFirst({
            where: {
              roomId: data.roomId,
              status: { in: ["confirmed", "checked-in"] },
              checkIn: { lt: new Date(data.checkOut) },
              checkOut: { gt: new Date(data.checkIn) },
            },
          });

          if (conflict) {
            throw new Error("La habitacion ya tiene una reserva en esas fechas");
          }

        const room = await tx.room.findUnique({
          where: { id: data.roomId },
          include: { roomType: true },
        });

        if (room && data.adults > room.roomType.capacity) {
          throw new Error(`Capacidad maxima de la habitacion es ${room.roomType.capacity} personas`);
        }

          const activeRatePlan = room
            ? await prisma.ratePlan.findFirst({
                where: {
                  roomTypeId: room.roomTypeId,
                  startDate: { lte: new Date(data.checkIn) },
                  endDate: { gte: new Date(data.checkOut) },
                  hotelId,
                },
                orderBy: { price: "asc" },
              })
            : null;

          let effectiveRate = activeRatePlan ? activeRatePlan.price : data.roomRate;
          const baseRate = effectiveRate;
          const occupancySurcharge = data.adults > 1 ? baseRate * 0.15 * (data.adults - 1) : 0;
        effectiveRate = baseRate + occupancySurcharge;
        const subtotal = effectiveRate * data.totalNights;
        const taxAmount = Math.round(subtotal * (hotel.taxRate / 100) * 100) / 100;
        const effectiveTotal = subtotal + taxAmount;

        const occupancyNote = occupancySurcharge > 0
          ? ` | Tarifa base: $${baseRate.toFixed(2)} + Suplemento ${data.adults - 1} persona${data.adults - 1 > 1 ? "s" : ""}: $${occupancySurcharge.toFixed(2)}/noche`
          : "";
        const taxNote = hotel.taxRate > 0 ? ` | Impuesto (${hotel.taxRate}%): $${taxAmount.toFixed(2)}` : "";
        const combinedNotes = (data.notes || "") + occupancyNote + taxNote;

        return tx.booking.create({
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
            hotelId,
          },
          include: {
            guest: true,
            room: { include: { roomType: true } },
          },
        });
        });

        await notifyRole({
          role: "admin",
          hotelId,
          title: `Nueva reserva: ${booking.code}`,
          message: `Reserva para ${booking.guest.firstName} ${booking.guest.lastName} - ${formatDate(booking.checkIn)} a ${formatDate(booking.checkOut)}`,
          type: "info",
        }).catch(() => {});

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

        await logAction({
          userId,
          action: "create",
          entity: "booking",
          entityId: booking.id,
          details: `Reserva ${booking.code} creada`,
          hotelId,
        }).catch(() => {});

        return NextResponse.json(booking, { status: 201 });
      } catch (error: unknown) {
        lastError = error;
        const isUniqueConstraint =
          error instanceof Error &&
          (error as any).code === "P2002" &&
          (error as any).meta?.target?.includes("code");
        if (!isUniqueConstraint) break;
      }
    }
    throw lastError;
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
      if (message.includes("ya no esta disponible") || message.includes("ya tiene una reserva") || message.includes("Capacidad maxima")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
