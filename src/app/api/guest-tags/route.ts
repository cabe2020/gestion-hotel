import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guestTagSchema } from '@/lib/validations';
import { requireAdmin, resolveHotelId } from '@/lib/rbac';
import { ZodError } from 'zod';

export async function GET(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return NextResponse.json([]);
  const tags = await prisma.guestTag.findMany({
    where: { hotelId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  try {
    const body = await request.json();
    const data = guestTagSchema.parse(body);
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 404 });
    const tag = await prisma.guestTag.create({
      data: { name: data.name, color: data.color, hotelId },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
