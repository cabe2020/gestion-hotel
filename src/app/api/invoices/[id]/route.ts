import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getUserFromHeaders } from '@/lib/rbac';
import { notifyRole } from '@/lib/notifications';
import { logAction } from '@/lib/audit';
import { z, ZodError } from 'zod';

const invoiceUpdateSchema = z.object({
  status: z.enum(['pending', 'paid']).optional(),
  taxAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  cancelled: z.boolean().optional(),
  cancelReason: z.string().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  try {
    const { id: userId } = getUserFromHeaders(request);
    const { id } = await params;
    const body = await request.json();
    const data = invoiceUpdateSchema.parse(body);

    if (data.cancelled) {
      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          cancelled: true,
          cancelReason: data.cancelReason || '',
          status: 'pending',
        },
        include: {
          booking: {
            include: {
              guest: true,
              room: { include: { roomType: true } },
            },
          },
        },
      });

      if (invoice.hotelId) {
        await notifyRole({
          role: 'admin',
          hotelId: invoice.hotelId,
          title: `Factura ${invoice.number} anulada`,
          message: `Factura anulada - Motivo: ${data.cancelReason || 'No especificado'}`,
          type: 'error',
        }).catch(() => {});
      }

      await logAction({
        userId,
        action: 'cancel',
        entity: 'invoice',
        entityId: id,
        details: `Factura ${invoice.number} anulada`,
        hotelId: invoice.hotelId,
      }).catch(() => {});

      return NextResponse.json(invoice);
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: {
        booking: {
          include: {
            guest: true,
            room: { include: { roomType: true } },
          },
        },
      },
    });
    return NextResponse.json(invoice);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
