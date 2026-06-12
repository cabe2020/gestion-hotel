import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, checkInReminderHtml } from '@/lib/email';
import { logAction } from '@/lib/audit';
import { verifyCronSecret, resolveHotelId } from '@/lib/rbac';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json({ sent: 0, message: 'No hotel found' });
    }

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      return NextResponse.json({ sent: 0, message: 'No hotel found' });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        status: 'confirmed',
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

    if (sent > 0) {
      await logAction({
        hotelId: hotel.id,
        action: 'CRON_REMINDERS',
        entity: 'booking',
        details: JSON.stringify({ count: sent }),
      }).catch(() => {});
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
