import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReceiptPDF } from "@/lib/pdf";
import { resolveHotelId } from "@/lib/rbac";
import { z, ZodError } from "zod";

const schema = z.object({ paymentId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentId } = schema.parse(body);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            guest: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json(
        { error: "Hotel no encontrado" },
        { status: 404 }
      );
    }

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      return NextResponse.json(
        { error: "Hotel no encontrado" },
        { status: 404 }
      );
    }

    const doc = generateReceiptPDF({
      hotel: { name: hotel.name, currency: hotel.currency },
      payment: {
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        createdAt: payment.createdAt.toISOString(),
      },
      booking: {
        code: payment.booking.code,
        guest: {
          firstName: payment.booking.guest.firstName,
          lastName: payment.booking.guest.lastName,
        },
      },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-${payment.id}.pdf"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
