import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveHotelId } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: "checkIn y checkOut son requeridos (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: "La fecha de check-out debe ser posterior a la de check-in" },
        { status: 400 }
      );
    }

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json([], { status: 200 });
    }

    const adults = parseInt(searchParams.get("adults") || "1", 10);

    const roomTypes = await prisma.roomType.findMany({
      where: { hotelId },
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
      orderBy: { basePrice: "asc" },
    });

    const availability = await Promise.all(
      roomTypes.map(async (rt) => {
        const roomsOfThisType = rt.rooms;
        const bookedRoomIds = await prisma.booking.findMany({
          where: {
            roomId: { in: roomsOfThisType.map((r) => r.id) },
            status: { in: ["confirmed", "checked-in"] },
            checkIn: { lt: checkOutDate },
            checkOut: { gt: checkInDate },
          },
          select: { roomId: true },
          distinct: ["roomId"],
        });

        const bookedCount = bookedRoomIds.length;
        const availableCount = roomsOfThisType.length - bookedCount;

        const applicableRate = rt.ratePlans.find(
          (rp) => {
            const nights = Math.ceil(
              (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            return nights >= rp.minStay;
          }
        );

        const pricePerNight = applicableRate ? applicableRate.price : rt.basePrice;

        return {
          id: rt.id,
          name: rt.name,
          code: rt.code,
          capacity: rt.capacity,
          amenities: rt.amenities,
          basePrice: rt.basePrice,
          pricePerNight,
          totalRooms: roomsOfThisType.length,
          availableCount,
          ratePlanName: applicableRate?.name || null,
        };
      })
    );

    return NextResponse.json(
      availability.filter((a) => a.availableCount > 0 && a.capacity >= adults)
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
