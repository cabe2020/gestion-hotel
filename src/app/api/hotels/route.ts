import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hotelSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/rbac";
import { ZodError } from "zod";

export async function GET() {
  const hotel = await prisma.hotel.findFirst();
  return NextResponse.json(hotel);
}

export async function POST(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  try {
    const body = await request.json();
    const data = hotelSchema.parse(body);
    const hotel = await prisma.hotel.create({ data });
    return NextResponse.json(hotel, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
