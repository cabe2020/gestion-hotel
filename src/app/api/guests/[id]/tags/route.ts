import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assignments = await prisma.guestTagAssignment.findMany({
    where: { guestId: id },
    include: { tag: true },
  });
  const tags = assignments.map((a) => a.tag);
  return NextResponse.json(tags);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { tagId } = body;
    if (!tagId)
      return NextResponse.json({ error: "tagId requerido" }, { status: 400 });
    const assignment = await prisma.guestTagAssignment.create({
      data: { guestId: id, tagId },
      include: { tag: true },
    });
    return NextResponse.json(assignment.tag, { status: 201 });
  } catch (error: unknown) {
    const msg = String(error);
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Etiqueta ya asignada" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { tagId } = body;
    if (!tagId)
      return NextResponse.json({ error: "tagId requerido" }, { status: 400 });
    await prisma.guestTagAssignment.deleteMany({
      where: { guestId: id, tagId },
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
