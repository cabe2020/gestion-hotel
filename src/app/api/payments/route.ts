import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { paymentSchema } from '@/lib/validations';
import { notifyRole } from '@/lib/notifications';
import { logAction } from '@/lib/audit';
import { getUserFromHeaders, resolveHotelId } from '@/lib/rbac';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    const body = await request.json();
    const data = paymentSchema.parse(body);
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const [booking] = await tx.$queryRaw<
        { id: string; paidAmount: number; totalAmount: number; code: string }[]
      >`SELECT id, "paidAmount", "totalAmount", code FROM "Booking" WHERE id = ${data.bookingId} FOR UPDATE`;

      if (!booking) {
        throw Object.assign(new Error('Reserva no encontrada'), { statusCode: 404 });
      }

      if (data.method === 'refund') {
        if (data.amount >= 0) {
          throw Object.assign(new Error('El reembolso debe tener un monto negativo'), {
            statusCode: 400,
          });
        }
        if (booking.paidAmount + data.amount < 0) {
          throw Object.assign(new Error('El reembolso excede el monto pagado'), {
            statusCode: 400,
          });
        }
      } else {
        if (data.amount <= 0) {
          throw Object.assign(new Error('El monto debe ser positivo'), { statusCode: 400 });
        }
        if (booking.paidAmount + data.amount > booking.totalAmount) {
          throw Object.assign(new Error('El pago excede el monto pendiente'), { statusCode: 400 });
        }
      }

      const payment = await tx.payment.create({
        data: {
          bookingId: data.bookingId,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
        },
      });

      const isRefund = data.method === 'refund';
      const cashMove = await tx.cashMove.create({
        data: {
          type: isRefund ? 'expense' : 'income',
          category: isRefund ? 'refund' : 'room-revenue',
          amount: Math.abs(data.amount),
          concept: isRefund
            ? `Reembolso reserva ${data.bookingId}`
            : `Pago reserva ${data.bookingId}`,
          method: isRefund ? 'cash' : data.method,
          reference: data.reference,
          hotelId,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: { cashMoveId: cashMove.id },
      });

      await tx.$executeRaw`UPDATE "Booking" SET "paidAmount" = "paidAmount" + ${data.amount} WHERE id = ${data.bookingId}`;

      return { payment, bookingCode: booking.code };
    });

    if (!result.payment.method?.startsWith('refund') && hotelId) {
      await notifyRole({
        role: 'admin',
        hotelId,
        title: `Pago recibido: $${data.amount} para reserva ${result.bookingCode}`,
        message: `Pago de ${data.method} por $${data.amount} registrado`,
        type: 'success',
      }).catch(() => {});
    }

    await logAction({
      userId,
      action: data.method === 'refund' ? 'refund' : 'create',
      entity: 'payment',
      entityId: result.payment.id,
      details: `${data.method === 'refund' ? 'Reembolso' : 'Pago'} $${Math.abs(data.amount)} reserva ${result.bookingCode}`,
      hotelId,
    }).catch(() => {});

    return NextResponse.json(result.payment, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
