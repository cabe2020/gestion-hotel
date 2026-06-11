import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guestTagSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/rbac";
import { ZodError } from "zod";

export async function GET() {
  const hotel = await prisma.hotel.findFirst();
  if (!hotel) return NextResponse.json([]);
  const tags = await prisma.guestTag.findMany({
    where: { hotelId: hotel.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  try {
    const body = await request.json();
    const data = guestTagSchema.parse(body);
    const hotel = await prisma.hotel.findFirst();
    if (!hotel)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    const tag = await prisma.guestTag.create({
      data: { name: data.name, color: data.color, hotelId: hotel.id },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
