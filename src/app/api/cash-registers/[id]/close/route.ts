import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getUserFromHeaders } from "@/lib/rbac";
import { notifyRole } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;
  const { id: userId } = getUserFromHeaders(request);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.cashRegister.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
  }

  const openingCash = existing.openingCash;
  const totalIncome = body.totalIncome ?? existing.totalIncome;
  const totalExpense = body.totalExpense ?? existing.totalExpense;
  const closingCash = body.closingCash;
  const expectedCash = openingCash + totalIncome - totalExpense;
  const discrepancy = Math.round((closingCash - expectedCash) * 100) / 100;

  const register = await prisma.cashRegister.update({
    where: { id },
    data: {
      status: "closed",
      closedAt: new Date(),
      closingCash,
      totalIncome,
      totalExpense,
      notes: body.notes,
      closedBy: userId,
    },
  });

  if (register.hotelId) {
    await notifyRole({
      role: "admin",
      hotelId: register.hotelId,
      title: "Caja cerrada",
      message: `Cierre de caja - Efectivo: $${closingCash}`,
      type: "warning",
    }).catch(() => {});

    await logAction({
      userId,
      action: "close",
      entity: "cash-register",
      entityId: id,
      details: `Caja cerrada con $${closingCash}`,
      hotelId: register.hotelId,
    }).catch(() => {});
  }

  return NextResponse.json({
    ...register,
    discrepancy,
    expectedCash,
    actualCash: closingCash,
  });
}
