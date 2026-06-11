import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: body.read ?? true },
    });

    return NextResponse.json(notification);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
