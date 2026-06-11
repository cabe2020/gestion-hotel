import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret, resolveHotelId } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json({ error: "No hotel found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const noShowBookings = await prisma.booking.findMany({
      where: {
        hotelId,
        status: "confirmed",
        checkIn: { lt: today },
      },
      include: { room: true },
    });

    for (const booking of noShowBookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "no-show" },
      });

      if (booking.roomId) {
        const otherBookings = await prisma.booking.count({
          where: {
            id: { not: booking.id },
            roomId: booking.roomId,
            status: { in: ["confirmed", "checked-in"] },
          },
        });
        if (otherBookings === 0) {
          await prisma.room.update({
            where: { id: booking.roomId },
            data: { status: "available" },
          });
        }
      }
    }

    if (noShowBookings.length > 0) {
      await logAction({
        hotelId,
        action: "CRON_NOSHOW",
        entity: "booking",
        details: JSON.stringify({ count: noShowBookings.length }),
      }).catch(() => {});
    }

    return NextResponse.json({
      marked: noShowBookings.length,
      bookingIds: noShowBookings.map((b) => b.id),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
