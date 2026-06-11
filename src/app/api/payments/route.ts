import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validations";
import { notifyRole } from "@/lib/notifications";
import { logAction } from "@/lib/audit";
import { getUserFromHeaders } from "@/lib/rbac";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    const body = await request.json();
    const data = paymentSchema.parse(body);
    const hotel = await prisma.hotel.findFirst();
    if (!hotel)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
    });
    if (!booking)
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );

    if (data.method === "refund") {
      if (data.amount >= 0) {
        return NextResponse.json(
          { error: "El reembolso debe tener un monto negativo" },
          { status: 400 }
        );
      }
      if (booking.paidAmount + data.amount < 0) {
        return NextResponse.json(
          { error: "El reembolso excede el monto pagado" },
          { status: 400 }
        );
      }
    } else {
      if (data.amount <= 0) {
        return NextResponse.json(
          { error: "El monto debe ser positivo" },
          { status: 400 }
        );
      }
      if (booking.paidAmount + data.amount > booking.totalAmount) {
        return NextResponse.json(
          { error: "El pago excede el monto pendiente" },
          { status: 400 }
        );
      }
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
      },
    });

    const isRefund = data.method === "refund";
    const cashMove = await prisma.cashMove.create({
      data: {
        type: isRefund ? "expense" : "income",
        category: isRefund ? "refund" : "room-revenue",
        amount: Math.abs(data.amount),
        concept: isRefund
          ? `Reembolso reserva ${data.bookingId}`
          : `Pago reserva ${data.bookingId}`,
        method: isRefund ? "cash" : data.method,
        reference: data.reference,
        hotelId: hotel.id,
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { cashMoveId: cashMove.id },
    });

    const newPaid = booking.paidAmount + data.amount;
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { paidAmount: newPaid },
    });

    if (!isRefund && hotel) {
      await notifyRole({
        role: "admin",
        hotelId: hotel.id,
        title: `Pago recibido: $${data.amount} para reserva ${booking.code}`,
        message: `Pago de ${data.method} por $${data.amount} registrado`,
        type: "success",
      }).catch(() => {});
    }

    await logAction({
      userId,
      action: isRefund ? "refund" : "create",
      entity: "payment",
      entityId: payment.id,
      details: `${isRefund ? "Reembolso" : "Pago"} $${Math.abs(data.amount)} reserva ${booking.code}`,
      hotelId: hotel?.id,
    }).catch(() => {});

    return NextResponse.json(payment, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
