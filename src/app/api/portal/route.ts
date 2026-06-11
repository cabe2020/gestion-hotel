import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Codigo de reserva requerido" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { code },
      include: {
        guest: true,
        room: { include: { roomType: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { error: "La reserva no esta en estado confirmada" },
        { status: 400 }
      );
    }

    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const threeDaysBefore = new Date(checkInDate);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

    if (now < threeDaysBefore) {
      return NextResponse.json(
        { error: "El check-in digital solo esta disponible hasta 3 dias antes de su llegada" },
        { status: 400 }
      );
    }

    const digitalCheckInDone = booking.notes?.includes("[CHECK-IN-DIGITAL-COMPLETADO]");

    return NextResponse.json({
      id: booking.id,
      code: booking.code,
      status: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      roomRate: booking.roomRate,
      totalNights: booking.totalNights,
      totalAmount: booking.totalAmount,
      specialRequests: booking.specialRequests,
      digitalCheckInDone: !!digitalCheckInDone,
      guest: {
        id: booking.guest.id,
        firstName: booking.guest.firstName,
        lastName: booking.guest.lastName,
        email: booking.guest.email,
        phone: booking.guest.phone,
        idNumber: booking.guest.idNumber,
        nationality: booking.guest.nationality,
      },
      room: booking.room
        ? {
            number: booking.room.number,
            roomType: {
              name: booking.room.roomType.name,
              capacity: booking.room.roomType.capacity,
            },
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
