import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ZodError } from 'zod';

const bookingUpsellSchema = z.object({
  bookingId: z.string().min(1, 'Reserva requerida'),
  upsellName: z.string().min(1, 'Nombre requerido'),
  price: z.number().min(0, 'Precio debe ser positivo'),
  category: z.string().optional().default('other'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = bookingUpsellSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const folioItem = await prisma.folioItem.create({
      data: {
        bookingId: data.bookingId,
        concept: `Upsell: ${data.upsellName}`,
        amount: data.price,
        category: data.category,
      },
    });

    await prisma.booking.update({
      where: { id: data.bookingId },
      data: {
        totalAmount: booking.totalAmount + data.price,
      },
    });

    return NextResponse.json(folioItem, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
