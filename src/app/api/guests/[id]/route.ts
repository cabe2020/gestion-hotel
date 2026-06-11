import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getUserFromHeaders } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guest = await prisma.guest.findUnique({
    where: { id },
    include: { bookings: { include: { room: { include: { roomType: true } } } }, tags: { include: { tag: true } } },
  });
  if (!guest)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(guest);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = getUserFromHeaders(request);
  const { id } = await params;
  const body = await request.json();
  const guest = await prisma.guest.update({
    where: { id },
    data: body,
  });

  await logAction({
    userId,
    action: "update",
    entity: "guest",
    entityId: id,
    details: `Huesped ${guest.firstName} ${guest.lastName} actualizado`,
    hotelId: guest.hotelId,
  }).catch(() => {});

  return NextResponse.json(guest);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  const { id: userId } = getUserFromHeaders(request);
  const { id } = await params;
  const guest = await prisma.guest.findUnique({ where: { id } });
  await prisma.guest.delete({ where: { id } });
  if (guest) {
    await logAction({
      userId,
      action: "delete",
      entity: "guest",
      entityId: id,
      details: `Huesped ${guest.firstName} ${guest.lastName} eliminado`,
      hotelId: guest.hotelId,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
