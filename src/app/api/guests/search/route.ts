import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveHotelId } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json([]);

    const where: Record<string, unknown> = { hotelId };
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { idNumber: { contains: q, mode: "insensitive" } },
      ];
    }

        const guests = await prisma.guest.findMany({
          where,
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, idNumber: true, nationality: true },
          orderBy: { lastName: "asc" },
          take: 10,
        });

        return NextResponse.json(guests.map(g => ({ ...g, name: `${g.firstName} ${g.lastName}` })));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
