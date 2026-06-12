import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { code, lastName } = await request.json();

    if (!code || !lastName) {
      return NextResponse.json({ error: 'Código y apellido requeridos' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { code },
      include: { guest: true, room: true },
    });

    if (!booking || booking.guest.lastName.toLowerCase() !== lastName.toLowerCase()) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'La reserva no está en estado confirmado' },
        { status: 400 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'checked-in' },
      include: { guest: true, room: true },
    });

    if (booking.roomId) {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'occupied' },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
