import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ZodError } from 'zod';

const checkInSchema = z.object({
  code: z.string().min(1, 'Codigo requerido'),
  idNumber: z.string().min(1, 'Numero de identidad requerido'),
  emergencyContact: z.string().min(1, 'Contacto de emergencia requerido'),
  emergencyPhone: z.string().min(1, 'Telefono de emergencia requerido'),
  specialRequests: z.string().optional().default(''),
  signature: z.string().min(1, 'Firma digital requerida'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = checkInSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { code: data.code },
      include: { guest: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'La reserva no esta en estado confirmada' },
        { status: 400 }
      );
    }

    await prisma.guest.update({
      where: { id: booking.guestId },
      data: { idNumber: data.idNumber },
    });

    const existingNotes = booking.notes || '';
    const checkInNotes = [
      `[CHECK-IN-DIGITAL-COMPLETADO]`,
      `Contacto emergencia: ${data.emergencyContact} - ${data.emergencyPhone}`,
      `ID: ${data.idNumber}`,
      `Firma: [REGISTRADA]`,
    ].join(' | ');

    const newNotes = existingNotes ? `${existingNotes} | ${checkInNotes}` : checkInNotes;

    const newSpecialRequests = [
      booking.specialRequests || '',
      data.specialRequests ? `Check-in digital: ${data.specialRequests}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        notes: newNotes,
        specialRequests: newSpecialRequests || booking.specialRequests,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Check-in digital completado exitosamente',
      code: booking.code,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
