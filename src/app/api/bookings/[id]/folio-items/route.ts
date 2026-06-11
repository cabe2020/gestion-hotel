import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const items = await prisma.folioItem.findMany({
    where: { bookingId: id },
    orderBy: { date: "asc" },
  });

  const mapped = items.map((item) => ({
    description: item.concept,
    amount: item.amount,
    category: item.category,
    date: item.date,
  }));

  return NextResponse.json(mapped);
}