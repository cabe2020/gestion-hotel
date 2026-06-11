import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { folioItemSchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const where = bookingId ? { bookingId } : {};
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
    const body = await request.json();
    const data = folioItemSchema.parse(body);
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
