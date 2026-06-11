import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ratePlanSchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET() {
  const hotel = await prisma.hotel.findFirst();
  if (!hotel) return NextResponse.json([]);
  const ratePlans = await prisma.ratePlan.findMany({
    where: { hotelId: hotel.id },
    include: { roomType: true },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(ratePlans);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = ratePlanSchema.parse(body);
    const hotel = await prisma.hotel.findFirst();
    if (!hotel)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    const ratePlan = await prisma.ratePlan.create({
      data: {
        name: data.name,
        roomTypeId: data.roomTypeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        price: data.price,
        minStay: data.minStay ?? 1,
        hotelId: hotel.id,
      },
      include: { roomType: true },
    });
    return NextResponse.json(ratePlan, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
