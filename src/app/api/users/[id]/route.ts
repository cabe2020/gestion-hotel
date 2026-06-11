import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getUserFromHeaders } from "@/lib/rbac";
import { updateUserSchema } from "@/lib/validations";
import { logAction } from "@/lib/audit";
import { ZodError } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    if (data.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "Ya existe un usuario con ese email" },
          { status: 409 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    await logAction({
      userId: getUserFromHeaders(request).id,
      action: "update",
      entity: "user",
      entityId: id,
      details: `Usuario ${user.name} actualizado`,
    }).catch(() => {});
    return NextResponse.json(user);
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
  const user = await prisma.user.update({
    where: { id },
    data: { active: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  await logAction({
    userId: getUserFromHeaders(request).id,
    action: "deactivate",
    entity: "user",
    entityId: id,
    details: `Usuario ${user.name} desactivado`,
  }).catch(() => {});
  return NextResponse.json(user);
}
