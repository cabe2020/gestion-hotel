import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from './prisma';

function computeSignature(userId: string, role: string, hotelId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET no configurado');
  }
  return crypto.createHmac('sha256', secret).update(`${userId}:${role}:${hotelId}`).digest('hex');
}

export function getUserFromHeaders(request: Request) {
  const verified = request.headers.get('x-middleware-verified');
  if (verified !== 'true') {
    throw new NextResponse(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = request.headers.get('x-user-id') || '';
  const role = request.headers.get('x-user-role') || '';
  const hotelId = request.headers.get('x-hotel-id') || '';

  const sig = request.headers.get('x-middleware-sig');
  const expectedSig = computeSignature(id, role, hotelId);

  if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    throw new NextResponse(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { id, role, hotelId };
}

export function getHotelId(headers: Headers): string | null {
  return headers.get('x-hotel-id') || null;
}

export async function resolveHotelId(headers: Headers): Promise<string | null> {
  const headerHotelId = getHotelId(headers);
  if (headerHotelId) return headerHotelId;
  const userId = headers.get('x-user-id');
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { hotelId: true } });
  return user?.hotelId || null;
}

export function requireAdmin(request: Request): NextResponse | null {
  const { role } = getUserFromHeaders(request);
  if (role !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Se requiere rol de administrador.' },
      { status: 403 }
    );
  }
  return null;
}

export function requireRole(request: Request, roles: string[]): NextResponse | null {
  const { role } = getUserFromHeaders(request);
  if (!roles.includes(role)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }
  return null;
}

export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') === secret) return true;

  return false;
}
