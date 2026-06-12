import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const { id: userId } = getUserFromHeaders(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) where.read = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
