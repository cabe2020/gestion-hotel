import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guestTagSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/rbac";
import { ZodError } from "zod";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = guestTagSchema.partial().parse(body);
    const tag = await prisma.guestTag.update({
      where: { id },
      data,
    });
    return NextResponse.json(tag);
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
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  const { id } = await params;
  await prisma.guestTag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
