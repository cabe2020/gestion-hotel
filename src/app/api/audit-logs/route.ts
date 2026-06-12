import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/rbac';

export async function GET(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const url = new URL(request.url);
    const entity = url.searchParams.get('entity');
    const userId = url.searchParams.get('userId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, pageSize });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
