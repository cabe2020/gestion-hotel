import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guestSchema } from "@/lib/validations";
import { getUserFromHeaders, resolveHotelId } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return NextResponse.json({ data: [], total: 0, page: 1, totalPages: 0 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { hotelId };
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { idNumber: { contains: search } },
      { phone: { contains: search } },
    ];
  }
  const [guests, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      include: { bookings: true, tags: { include: { tag: true } } },
      orderBy: { lastName: "asc" },
      skip,
      take: limit,
    }),
    prisma.guest.count({ where }),
  ]);
  return NextResponse.json({
    data: guests,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = guestSchema.parse(body);
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    const guest = await prisma.guest.create({
      data: { ...data, hotelId },
    });

    await logAction({
      userId: getUserFromHeaders(request).id,
      action: "create",
      entity: "guest",
      entityId: guest.id,
      details: `Huesped ${guest.firstName} ${guest.lastName} creado`,
      hotelId,
    }).catch(() => {});
    return NextResponse.json(guest, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
