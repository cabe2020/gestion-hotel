import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hotelSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/rbac";
import { ZodError } from "zod";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  try {
    const { id } = await params;
    const body = await request.json();
    const data = hotelSchema.partial().parse(body);
    const hotel = await prisma.hotel.update({ where: { id }, data });
    return NextResponse.json(hotel);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
