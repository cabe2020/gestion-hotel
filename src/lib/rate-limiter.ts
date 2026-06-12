interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  keyPrefix = 'api'
) {
  return (request: Request) => {
    const ip = getClientIp(request);
    const key = `${keyPrefix}:${ip}`;
    return rateLimit(key, maxRequests, windowMs);
  };
}

const apiRateLimiter = createRateLimiter(100, 60 * 1000, 'api');
const authRateLimiter = createRateLimiter(10, 60 * 1000, 'auth');
const uploadRateLimiter = createRateLimiter(20, 60 * 1000, 'upload');

export { apiRateLimiter, authRateLimiter, uploadRateLimiter };