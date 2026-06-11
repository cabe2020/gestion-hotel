import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getUserFromHeaders } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await prisma.room.findUnique({
    where: { id },
    include: { roomType: true },
  });
  if (!room)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(room);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = getUserFromHeaders(request);
  const { id } = await params;
  const body = await request.json();
  const room = await prisma.room.update({
    where: { id },
    data: body,
    include: { roomType: true },
  });

  if (body.status) {
    await logAction({
      userId,
      action: "status-change",
      entity: "room",
      entityId: id,
      details: `Habitacion ${room.number} estado: ${body.status}`,
      hotelId: room.hotelId,
    }).catch(() => {});
  } else {
    await logAction({
      userId,
      action: "update",
      entity: "room",
      entityId: id,
      details: `Habitacion ${room.number} actualizada`,
      hotelId: room.hotelId,
    }).catch(() => {});
  }

  return NextResponse.json(room);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  const { id } = await params;
  await prisma.room.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
