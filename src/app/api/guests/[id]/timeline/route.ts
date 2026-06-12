import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guest = await prisma.guest.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [bookings, auditLogs] = await Promise.all([
    prisma.booking.findMany({
      where: { guestId: id },
      include: {
        room: { include: { roomType: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        folioItems: { orderBy: { date: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: {
        entity: 'guest',
        entityId: id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const allPayments = bookings.flatMap((b) =>
    b.payments.map((p) => ({
      ...p,
      bookingCode: b.code,
      bookingId: b.id,
    }))
  );

  const allFolioItems = bookings.flatMap((b) =>
    b.folioItems.map((f) => ({
      ...f,
      bookingCode: b.code,
      bookingId: b.id,
    }))
  );

  allPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  allFolioItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    bookings,
    payments: allPayments,
    folioItems: allFolioItems,
    auditLogs,
  });
}
