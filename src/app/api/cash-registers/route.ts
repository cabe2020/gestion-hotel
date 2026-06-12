import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cashRegisterSchema } from '@/lib/validations';
import { requireAdmin, getUserFromHeaders, resolveHotelId } from '@/lib/rbac';
import { notifyRole } from '@/lib/notifications';
import { logAction } from '@/lib/audit';
import { ZodError } from 'zod';

export async function GET(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return NextResponse.json([]);
  const registers = await prisma.cashRegister.findMany({
    where: { hotelId },
    orderBy: { openedAt: 'desc' },
  });
  return NextResponse.json(registers);
}

export async function POST(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  try {
    const { id: userId } = getUserFromHeaders(request);
    const body = await request.json();
    const data = cashRegisterSchema.parse(body);
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 404 });
    const register = await prisma.cashRegister.create({
      data: { ...data, hotelId, status: 'open', openedBy: userId },
    });

    await notifyRole({
      role: 'admin',
      hotelId,
      title: 'Caja abierta',
      message: `Se abrió caja con fondo de $${data.openingCash}`,
      type: 'info',
    }).catch(() => {});

    await logAction({
      userId,
      action: 'open',
      entity: 'cash-register',
      entityId: register.id,
      details: `Caja abierta con fondo $${data.openingCash}`,
      hotelId,
    }).catch(() => {});
    return NextResponse.json(register, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
