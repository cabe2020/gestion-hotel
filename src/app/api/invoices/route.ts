import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validations";
import { getUserFromHeaders, resolveHotelId } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return NextResponse.json([]);
  const invoices = await prisma.invoice.findMany({
    where: { hotelId },
    include: {
      booking: {
        include: {
          guest: true,
          room: { include: { roomType: true } },
          folioItems: { orderBy: { date: "asc" } },
        },
      },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  try {
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    const body = await request.json();
    const data = invoiceSchema.parse(body);

    let taxAmount = data.taxAmount ?? 0;
    let total = data.total;

    if (!total || !data.taxAmount) {
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: { folioItems: true },
      });
      if (booking) {
        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
        const subtotal = booking.folioItems.length > 0
          ? booking.folioItems.reduce((s, fi) => s + fi.amount, 0)
          : booking.roomRate * booking.totalNights;
        if (!data.taxAmount && hotel) {
          taxAmount = Math.round(subtotal * (hotel.taxRate / 100) * 100) / 100;
        }
        if (!total) {
          total = subtotal + taxAmount;
        }
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        number: data.number,
        bookingId: data.bookingId,
        hotelId,
        taxAmount,
        total,
        status: data.status,
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

    await logAction({
      userId: getUserFromHeaders(request).id,
      action: "create",
      entity: "invoice",
      entityId: invoice.id,
      details: `Factura ${invoice.number} creada`,
      hotelId: invoice.hotelId,
    }).catch(() => {});
    return NextResponse.json(invoice, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
