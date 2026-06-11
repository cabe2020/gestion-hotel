import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/rbac";

export async function PUT(request: Request) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
