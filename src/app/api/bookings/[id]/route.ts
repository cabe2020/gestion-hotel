import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getUserFromHeaders, resolveHotelId } from "@/lib/rbac";
import { updateBookingSchema } from "@/lib/validations";
import { logAction } from "@/lib/audit";
import { ZodError } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      room: { include: { roomType: true } },
      payments: true,
      invoice: true,
    },
  });
  if (!booking)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(booking);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    const { id } = await params;
    const body = await request.json();
    const data = updateBookingSchema.parse(body);

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    }
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new Error("Not found");
      }

      const existing = await tx.booking.findUnique({
        where: { id },
        include: { room: { include: { roomType: true } } },
      });
      if (!existing) throw new Error("Not found");

      let checkIn = data.checkIn ? new Date(data.checkIn as string | Date) : existing.checkIn;
      let checkOut = data.checkOut ? new Date(data.checkOut as string | Date) : existing.checkOut;
      let totalNights = data.totalNights;

      if ((data.checkIn || data.checkOut) && !data.totalNights) {
        const ms = checkOut.getTime() - checkIn.getTime();
        totalNights = Math.max(1, Math.ceil(ms / 86400000));
      } else if (!totalNights) {
        totalNights = existing.totalNights;
      }

      const needsRecalc = data.adults !== undefined || data.roomId || data.checkIn || data.checkOut;
      let roomRate = existing.roomRate;
      let totalAmount = existing.totalAmount;

      if (needsRecalc) {
        const roomIdForCalc = data.roomId || existing.roomId;
        const adultsForCalc = data.adults !== undefined ? data.adults : existing.adults;
        let baseRate = existing.roomRate;

        if (data.roomId && data.roomId !== existing.roomId) {
          const newRoom = await tx.room.findUnique({
            where: { id: data.roomId },
            include: { roomType: true },
          });
          if (newRoom) {
            if (adultsForCalc > newRoom.roomType.capacity) {
              throw new Error(`Capacidad maxima de la habitacion es ${newRoom.roomType.capacity} personas`);
            }
            baseRate = newRoom.roomType.basePrice;
          }
        } else if ((data.roomId === existing.roomId || !data.roomId) && existing.room?.roomType) {
          if (adultsForCalc > existing.room.roomType.capacity) {
            throw new Error(`Capacidad maxima de la habitacion es ${existing.room.roomType.capacity} personas`);
          }
          baseRate = existing.room.roomType.basePrice;
        }

        const occupancySurcharge = adultsForCalc > 1 ? baseRate * 0.15 * (adultsForCalc - 1) : 0;
        roomRate = baseRate + occupancySurcharge;
        const subtotal = roomRate * totalNights;
        const taxAmount = Math.round(subtotal * (hotel.taxRate / 100) * 100) / 100;
        totalAmount = subtotal + taxAmount;
      } else if (data.roomRate !== undefined) {
        roomRate = data.roomRate;
        totalAmount = roomRate * totalNights;
      } else if (data.totalAmount !== undefined) {
        totalAmount = data.totalAmount;
      }

      if (data.roomId && data.roomId !== existing.roomId) {
        const conflict = await tx.booking.findFirst({
          where: {
            id: { not: id },
            roomId: data.roomId,
            status: { in: ["confirmed", "checked-in"] },
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
          },
        });
        if (conflict)
          throw new Error("La nueva habitación no está disponible en esas fechas");

        if (existing.roomId) {
          const otherBookings = await tx.booking.count({
            where: {
              id: { not: id },
              roomId: existing.roomId,
              status: { in: ["confirmed", "checked-in"] },
            },
          });
          if (otherBookings === 0) {
            await tx.room.update({
              where: { id: existing.roomId },
              data: { status: "available" },
            });
          }
        }

        const statusForNewRoom = data.status || existing.status;
        if (statusForNewRoom === "checked-in") {
          await tx.room.update({
            where: { id: data.roomId },
            data: { status: "occupied" },
          });
        }
      }

      if (data.status === "checked-in") {
        const roomId = data.roomId || existing.roomId;
        if (roomId) {
          await tx.room.update({
            where: { id: roomId },
            data: { status: "occupied" },
          });
        }
      }

      if (data.status === "checked-out" || data.status === "cancelled") {
        const roomId = data.roomId || existing.roomId;
        if (roomId) {
          const otherBookings = await tx.booking.count({
            where: {
              id: { not: id },
              roomId,
              status: { in: ["confirmed", "checked-in"] },
            },
          });
          if (otherBookings === 0) {
            await tx.room.update({
              where: { id: roomId },
              data: { status: "available" },
            });
          }
        }
      }

      const updateData: Record<string, unknown> = {};
      if (data.guestId) updateData.guestId = data.guestId;
      if (data.roomId) updateData.roomId = data.roomId;
      if (data.checkIn) updateData.checkIn = checkIn;
      if (data.checkOut) updateData.checkOut = checkOut;
      if (data.adults !== undefined) updateData.adults = data.adults;
      if (data.children !== undefined) updateData.children = data.children;
      if (data.source !== undefined) updateData.source = data.source;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.specialRequests !== undefined) updateData.specialRequests = data.specialRequests;
      if (data.status) updateData.status = data.status;
      updateData.totalNights = totalNights;
      updateData.totalAmount = totalAmount;
      if (needsRecalc) updateData.roomRate = roomRate;

      return tx.booking.update({
        where: { id },
        data: updateData,
        include: {
          guest: true,
          room: { include: { roomType: true } },
          payments: true,
          invoice: true,
        },
      });
    });

    await logAction({
      userId,
      action: "update",
      entity: "booking",
      entityId: id,
      details: `Reserva ${updated.code} actualizada`,
      hotelId: updated.hotelId,
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (message.includes("no está disponible") || message.includes("Capacidad maxima")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (status !== "no-show" && status !== "cancelled") {
      return NextResponse.json(
        { error: "Solo se permite cambiar estado a 'no-show' o 'cancelled'" },
        { status: 400 }
      );
    }

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.status !== "confirmed") {
      return NextResponse.json(
        { error: "Solo se puede marcar no-show o cancelar reservas confirmadas" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    if (status === "cancelled") {
      updateData.notes = existing.notes
        ? `${existing.notes} | Cancelada el ${new Date().toISOString().split("T")[0]}`
        : `Cancelada el ${new Date().toISOString().split("T")[0]}`;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        guest: true,
        room: { include: { roomType: true } },
        payments: true,
        invoice: true,
      },
    });

    if (existing.roomId) {
      const otherBookings = await prisma.booking.count({
        where: {
          id: { not: id },
          roomId: existing.roomId,
          status: { in: ["confirmed", "checked-in"] },
        },
      });
      if (otherBookings === 0) {
        await prisma.room.update({
          where: { id: existing.roomId },
          data: { status: "available" },
        });
      }
    }

    await logAction({
      userId,
      action: status === "no-show" ? "no-show" : "cancel",
      entity: "booking",
      entityId: id,
      details: `Reserva ${updated.code} marcada como ${status === "no-show" ? "no-show" : "cancelada"}`,
      hotelId: updated.hotelId,
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  const { id: userId } = getUserFromHeaders(request);
  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  await prisma.booking.delete({ where: { id } });
  if (booking) {
    await logAction({
      userId,
      action: "delete",
      entity: "booking",
      entityId: id,
      details: `Reserva ${booking.code} eliminada`,
      hotelId: booking.hotelId,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
