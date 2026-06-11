import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validations";
import { getUserFromHeaders } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { ZodError } from "zod";

export async function GET() {
  const hotel = await prisma.hotel.findFirst();
  if (!hotel) return NextResponse.json([]);
  const invoices = await prisma.invoice.findMany({
    where: { hotelId: hotel.id },
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
    const body = await request.json();
    const data = invoiceSchema.parse(body);
    const invoice = await prisma.invoice.create({
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
