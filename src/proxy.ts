import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiRateLimiter, authRateLimiter, uploadRateLimiter, getClientIp } from '@/lib/rate-limiter';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  securityHeaders.forEach((header) => {
    response.headers.set(header.key, header.value);
  });

  const _ip = getClientIp(request);
  const path = request.nextUrl.pathname;

  let rateLimitResult;
  if (path.startsWith('/api/auth/')) {
    rateLimitResult = authRateLimiter(request);
  } else if (path.startsWith('/api/upload') || path.includes('/upload')) {
    rateLimitResult = uploadRateLimiter(request);
  } else if (path.startsWith('/api/')) {
    rateLimitResult = apiRateLimiter(request);
  }

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    if (!rateLimitResult.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          ...Object.fromEntries(securityHeaders.map((h) => [h.key, h.value])),
        },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};