import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/rbac";

export async function GET(request: Request) {
  const { id: userId, role } = getUserFromHeaders(request);

  if (role === "admin") {
    const hotels = await prisma.hotel.findMany({
      select: { id: true, name: true, logo: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(hotels);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hotelId: true },
  });

  if (!user?.hotelId) {
    const hotels = await prisma.hotel.findMany({
      select: { id: true, name: true, logo: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(hotels);
  }

  const hotel = await prisma.hotel.findUnique({
    where: { id: user.hotelId },
    select: { id: true, name: true, logo: true },
  });

  return NextResponse.json(hotel ? [hotel] : []);
}
