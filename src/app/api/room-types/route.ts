import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { roomTypeSchema } from '@/lib/validations';
import { requireAdmin, resolveHotelId } from '@/lib/rbac';
import { ZodError } from 'zod';

export async function GET(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return NextResponse.json([]);
  const types = await prisma.roomType.findMany({
    where: { hotelId },
    orderBy: { basePrice: 'asc' },
  });
  return NextResponse.json(types);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = roomTypeSchema.parse(body);
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 404 });
    const type = await prisma.roomType.create({
      data: { ...data, hotelId },
    });
    return NextResponse.json(type, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
