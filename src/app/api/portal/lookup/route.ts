import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const lastName = searchParams.get('lastName');

    if (!code || !lastName) {
      return NextResponse.json({ error: 'Código y apellido requeridos' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { code },
      include: {
        guest: true,
        room: { include: { roomType: true } },
        payments: true,
        invoice: true,
        hotel: true,
      },
    });

    if (!booking || booking.guest.lastName.toLowerCase() !== lastName.toLowerCase()) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
