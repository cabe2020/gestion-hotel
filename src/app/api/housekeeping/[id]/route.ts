import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getUserFromHeaders } from "@/lib/rbac";
import { notifyRole } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.housekeepingTask.findUnique({
      where: { id },
    });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.status === "completed" && existing.status !== "completed") {
      body.completedAt = new Date();
      const room = await prisma.room.update({
        where: { id: existing.roomId },
        data: { cleaningStatus: "clean" },
        include: { roomType: true },
      });
      if (existing.hotelId) {
        await notifyRole({
          role: "admin",
          hotelId: existing.hotelId,
          title: `Habitacion ${room.number} limpia`,
          message: `Limpieza completada - Hab. ${room.number}`,
          type: "success",
        }).catch(() => {});
      }
      await logAction({
        userId,
        action: "complete",
        entity: "housekeeping-task",
        entityId: id,
        details: `Habitacion ${room.number} limpieza completada`,
        hotelId: existing.hotelId,
      }).catch(() => {});
    }

    if (body.status === "in-progress" && existing.status !== "in-progress") {
      await prisma.room.update({
        where: { id: existing.roomId },
        data: { cleaningStatus: "inspecting" },
      });
    }

    if (body.assignedTo === "") body.assignedTo = null;

    const updated = await prisma.housekeepingTask.update({
      where: { id },
      data: body,
      include: {
        room: { include: { roomType: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    await prisma.housekeepingTask.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
