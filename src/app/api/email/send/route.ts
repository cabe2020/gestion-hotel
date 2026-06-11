import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, bookingConfirmationHtml, checkInReminderHtml } from "@/lib/email";
import { getUserFromHeaders } from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const { id: userId, hotelId } = getUserFromHeaders(request);
    if (!userId || !hotelId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { bookingId, emailType } = await request.json();

    if (!bookingId || !emailType) {
      return NextResponse.json({ error: "bookingId y emailType son requeridos" }, { status: 400 });
    }

    if (!["confirmation", "reminder"].includes(emailType)) {
      return NextResponse.json({ error: 'emailType debe ser "confirmation" o "reminder"' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, hotel: true, room: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    if (booking.hotelId !== hotelId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    if (!booking.guest.email) {
      return NextResponse.json({ error: "El huésped no tiene email registrado" }, { status: 400 });
    }

    const html = emailType === "confirmation"
      ? bookingConfirmationHtml(booking, booking.hotel)
      : checkInReminderHtml(booking, booking.hotel);

    const subject = emailType === "confirmation"
      ? `Confirmación de Reserva - ${booking.hotel.name}`
      : `Recordatorio de Check-in - ${booking.hotel.name}`;

    const result = await sendEmail({
      to: booking.guest.email,
      subject,
      html,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}