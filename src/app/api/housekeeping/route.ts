import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { housekeepingSchema } from "@/lib/validations";
import { notifyRole } from "@/lib/notifications";
import { logAction } from "@/lib/audit";
import { getUserFromHeaders } from "@/lib/rbac";
import { ZodError } from "zod";

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export async function GET() {
  try {
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) return NextResponse.json([]);

    const tasks = await prisma.housekeepingTask.findMany({
      where: { hotelId: hotel.id },
      include: {
        room: { include: { roomType: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const sorted = tasks.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
    );

    return NextResponse.json(sorted);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    const body = await request.json();
    const data = housekeepingSchema.parse(body);
    const hotel = await prisma.hotel.findFirst();
    if (!hotel)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });

    const assignedTo = data.assignedTo && data.assignedTo.trim() !== ""
      ? data.assignedTo
      : null;

    const task = await prisma.housekeepingTask.create({
      data: {
        roomId: data.roomId,
        type: data.type,
        priority: data.priority,
        assignedTo,
        notes: data.notes,
        hotelId: hotel.id,
      },
      include: {
        room: { include: { roomType: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (data.type === "cleaning") {
      await prisma.room.update({
        where: { id: data.roomId },
        data: { cleaningStatus: "dirty" },
      });
    }

    await notifyRole({
      role: "admin",
      hotelId: hotel.id,
      title: `Nueva tarea de limpieza: Hab ${task.room?.number || data.roomId}`,
      message: `Tarea ${data.type} - Prioridad: ${data.priority}`,
      type: "info",
    }).catch(() => {});

    await logAction({
      userId,
      action: "create",
      entity: "housekeeping-task",
      entityId: task.id,
      details: `Tarea de limpieza Hab ${task.room?.number || data.roomId} creada`,
      hotelId: hotel.id,
    }).catch(() => {});

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
