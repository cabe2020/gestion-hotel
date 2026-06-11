import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, checkInReminderHtml } from "@/lib/email";

export async function GET() {
  try {
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) {
      return NextResponse.json({ sent: 0, message: "No hotel found" });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId: hotel.id,
        status: "confirmed",
        checkIn: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
      },
      include: {
        guest: true,
        room: { include: { roomType: true } },
      },
    });

    let sent = 0;
    for (const booking of bookings) {
      if (!booking.guest.email) continue;
      try {
        await sendEmail({
          to: booking.guest.email,
          subject: `Recordatorio de Check-in - ${booking.code} - ${hotel.name}`,
          html: checkInReminderHtml(booking, hotel),
        });
        sent++;
      } catch {
        console.error(`Error enviando recordatorio para reserva ${booking.code}`);
      }
    }

    return NextResponse.json({
      sent,
      total: bookings.length,
      message: `${sent} recordatorios enviados de ${bookings.length} reservas`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
