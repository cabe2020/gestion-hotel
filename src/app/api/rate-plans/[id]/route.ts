import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ratePlanSchema } from '@/lib/validations';
import { requireAdmin } from '@/lib/rbac';
import { ZodError } from 'zod';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = ratePlanSchema.partial().parse(body);
    const updateData: Record<string, unknown> = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate as string);
    if (data.endDate) updateData.endDate = new Date(data.endDate as string);
    const ratePlan = await prisma.ratePlan.update({
      where: { id },
      data: updateData,
      include: { roomType: true },
    });
    return NextResponse.json(ratePlan);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  const { id } = await params;
  await prisma.ratePlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
