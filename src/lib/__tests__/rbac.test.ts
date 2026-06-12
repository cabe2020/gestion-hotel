import { describe, it, expect, beforeAll } from 'vitest';
import { getUserFromHeaders, requireAdmin, requireRole } from '../rbac';
import crypto from 'crypto';

process.env.NEXTAUTH_SECRET = 'test-secret-for-rbac-tests';

function makeSig(userId: string, role: string, hotelId: string): string {
  return crypto
    .createHmac('sha256', process.env.NEXTAUTH_SECRET!)
    .update(`${userId}:${role}:${hotelId}`)
    .digest('hex');
}

function makeRequest(headers: Record<string, string> = {}): Request {
  const userId = headers['x-user-id'] || '';
  const role = headers['x-user-role'] || '';
  const hotelId = headers['x-hotel-id'] || '';
  const sig = makeSig(userId, role, hotelId);
  return new Request('http://localhost', {
    headers: {
      'x-middleware-verified': 'true',
      'x-middleware-sig': sig,
      ...headers,
    },
  });
}

describe('getUserFromHeaders', () => {
  it('extracts user id and role from headers', () => {
    const request = makeRequest({
      'x-user-id': 'user-1',
      'x-user-role': 'admin',
      'x-hotel-id': 'hotel-1',
    });
    const user = getUserFromHeaders(request);
    expect(user.id).toBe('user-1');
    expect(user.role).toBe('admin');
    expect(user.hotelId).toBe('hotel-1');
  });

  it('throws 401 for missing middleware-verified header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-user-id': 'user-1', 'x-user-role': 'admin' },
    });
    expect(() => getUserFromHeaders(request)).toThrow();
  });

  it('throws 401 for invalid signature', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-middleware-verified': 'true',
        'x-middleware-sig': 'invalid-sig',
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
        'x-hotel-id': 'hotel-1',
      },
    });
    expect(() => getUserFromHeaders(request)).toThrow();
  });
});

describe('requireAdmin', () => {
  it('returns null for admin role', () => {
    const request = makeRequest({
      'x-user-id': 'user-1',
      'x-user-role': 'admin',
      'x-hotel-id': 'hotel-1',
    });
    const result = requireAdmin(request);
    expect(result).toBeNull();
  });

  it('returns 403 for non-admin role', () => {
    const request = makeRequest({
      'x-user-id': 'user-1',
      'x-user-role': 'receptionist',
      'x-hotel-id': 'hotel-1',
    });
    const result = requireAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('throws 401 when no auth headers', () => {
    const request = new Request('http://localhost');
    expect(() => requireAdmin(request)).toThrow();
  });
});

describe('requireRole', () => {
  it('returns null when role is in allowed list', () => {
    const request = makeRequest({
      'x-user-id': 'user-1',
      'x-user-role': 'receptionist',
      'x-hotel-id': 'hotel-1',
    });
    const result = requireRole(request, ['admin', 'receptionist']);
    expect(result).toBeNull();
  });

  it('returns 403 when role is not in allowed list', () => {
    const request = makeRequest({
      'x-user-id': 'user-1',
      'x-user-role': 'receptionist',
      'x-hotel-id': 'hotel-1',
    });
    const result = requireRole(request, ['admin']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('throws 401 when no auth headers', () => {
    const request = new Request('http://localhost');
    expect(() => requireRole(request, ['admin'])).toThrow();
  });
});
