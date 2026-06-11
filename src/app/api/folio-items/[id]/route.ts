import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateFolioItemSchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateFolioItemSchema.parse(body);
    const updateData: Record<string, unknown> = {};
    if (data.concept !== undefined) updateData.concept = data.concept;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    const folioItem = await prisma.folioItem.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(folioItem);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.folioItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
