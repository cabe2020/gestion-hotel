import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashMoveSchema } from "@/lib/validations";
import { requireAdmin, resolveHotelId } from "@/lib/rbac";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) return NextResponse.json({ data: [], total: 0, page: 1, totalPages: 0 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { hotelId };
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      createdAt.lte = toDate;
    }
    where.createdAt = createdAt;
  }
  const [moves, total] = await Promise.all([
    prisma.cashMove.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.cashMove.count({ where }),
  ]);
  return NextResponse.json({
    data: moves,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  try {
    const body = await request.json();
    const data = cashMoveSchema.parse(body);
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId)
      return NextResponse.json({ error: "No hotel" }, { status: 404 });
    const move = await prisma.cashMove.create({
      data: { ...data, hotelId },
    });
    return NextResponse.json(move, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
