import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roomTypeSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/rbac";
import { ZodError } from "zod";

export async function GET() {
  const hotel = await prisma.hotel.findFirst();
  if (!hotel) return NextResponse.json([]);
  const types = await prisma.roomType.findMany({
    where: { hotelId: hotel.id },
    orderBy: { basePrice: "asc" },
  });
  return NextResponse.json(types);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = roomTypeSchema.parse(body);
    const hotel = await prisma.hotel.findFirst();
    if (!hotel)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    const type = await prisma.roomType.create({
      data: { ...data, hotelId: hotel.id },
    });
    return NextResponse.json(type, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
