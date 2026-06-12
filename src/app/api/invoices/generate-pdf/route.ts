import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/lib/pdf';
import { z, ZodError } from 'zod';

const schema = z.object({ invoiceId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId } = schema.parse(body);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        booking: {
          include: {
            guest: true,
            room: { include: { roomType: true } },
            folioItems: { orderBy: { date: 'asc' } },
          },
        },
        hotel: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    const hotel = invoice.hotel;
    const booking = invoice.booking;

    const doc = generateInvoicePDF({
      hotel: {
        name: hotel.name,
        address: hotel.address,
        phone: hotel.phone,
        email: hotel.email,
        taxId: hotel.taxId,
        currency: hotel.currency,
        taxRate: hotel.taxRate,
      },
      invoice: {
        number: invoice.number,
        date: new Date(invoice.date).toLocaleDateString('es'),
        status: invoice.status,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        cancelled: invoice.cancelled,
        cancelReason: invoice.cancelReason,
      },
      booking: {
        code: booking.code,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        totalNights: booking.totalNights,
        roomRate: booking.roomRate,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        specialRequests: booking.specialRequests,
      },
      guest: {
        firstName: booking.guest.firstName,
        lastName: booking.guest.lastName,
        email: booking.guest.email,
        phone: booking.guest.phone,
        idNumber: booking.guest.idNumber,
        address: booking.guest.address,
      },
      room: {
        number: booking.room?.number || '',
        roomType: { name: booking.room?.roomType?.name || '' },
      },
      folioItems: booking.folioItems.map((fi) => ({
        concept: fi.concept,
        amount: fi.amount,
        category: fi.category,
        date: new Date(fi.date).toLocaleDateString('es'),
      })),
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="factura-${invoice.number}.pdf"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
