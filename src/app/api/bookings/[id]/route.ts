import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getUserFromHeaders } from "@/lib/rbac";
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

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { room: { include: { roomType: true } } },
    });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    let checkIn = data.checkIn ? new Date(data.checkIn as string | Date) : existing.checkIn;
    let checkOut = data.checkOut ? new Date(data.checkOut as string | Date) : existing.checkOut;
    let roomRate = data.roomRate ?? existing.roomRate;
    let totalNights = data.totalNights;
    let totalAmount = data.totalAmount;

    if ((data.checkIn || data.checkOut) && !data.totalNights) {
      const ms = checkOut.getTime() - checkIn.getTime();
      totalNights = Math.max(1, Math.ceil(ms / 86400000));
    } else if (!totalNights) {
      totalNights = existing.totalNights;
    }

    if ((data.checkIn || data.checkOut || data.roomRate || data.totalNights) && !data.totalAmount) {
      if (data.roomId) {
        const newRoom = await prisma.room.findUnique({
          where: { id: data.roomId },
          include: { roomType: true },
        });
        if (newRoom) roomRate = newRoom.roomType.basePrice;
      }
      totalAmount = roomRate * totalNights;
    } else if (!totalAmount) {
      totalAmount = existing.totalAmount;
    }

    if (data.roomId && data.roomId !== existing.roomId) {
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: id },
          roomId: data.roomId,
          status: { in: ["confirmed", "checked-in"] },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      });
      if (conflict)
        return NextResponse.json(
          { error: "La nueva habitación no está disponible en esas fechas" },
          { status: 409 }
        );

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

      const statusForNewRoom = data.status || existing.status;
      if (statusForNewRoom === "checked-in") {
        await prisma.room.update({
          where: { id: data.roomId },
          data: { status: "occupied" },
        });
      }
    }

    if (data.status === "checked-in") {
      const roomId = data.roomId || existing.roomId;
      if (roomId) {
        await prisma.room.update({
          where: { id: roomId },
          data: { status: "occupied" },
        });
      }
    }

    if (data.status === "checked-out" || data.status === "cancelled") {
      const roomId = data.roomId || existing.roomId;
      if (roomId) {
        const otherBookings = await prisma.booking.count({
          where: {
            id: { not: id },
            roomId,
            status: { in: ["confirmed", "checked-in"] },
          },
        });
        if (otherBookings === 0) {
          await prisma.room.update({
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
    if (data.roomRate !== undefined) updateData.roomRate = roomRate;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.specialRequests !== undefined) updateData.specialRequests = data.specialRequests;
    if (data.status) updateData.status = data.status;
    updateData.totalNights = totalNights;
    updateData.totalAmount = totalAmount;

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
