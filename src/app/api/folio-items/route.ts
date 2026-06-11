import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { folioItemSchema } from "@/lib/validations";
import { getUserFromHeaders, resolveHotelId } from "@/lib/rbac";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const where: Record<string, unknown> = bookingId
      ? { bookingId, booking: { hotelId } }
      : { booking: { hotelId } };
    const items = await prisma.folioItem.findMany({
      where,
      orderBy: { date: "asc" },
    });
    return NextResponse.json(items);
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    getUserFromHeaders(request);
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    const body = await request.json();
    const data = folioItemSchema.parse(body);
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { hotelId: true },
    });
    if (!booking || booking.hotelId !== hotelId) {
      return NextResponse.json(
        { error: "La reserva no pertenece a tu hotel" },
        { status: 403 }
      );
    }
    const folioItem = await prisma.folioItem.create({
      data: {
        bookingId: data.bookingId,
        concept: data.concept,
        amount: data.amount,
        category: data.category,
        date: data.date ? new Date(data.date) : undefined,
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
