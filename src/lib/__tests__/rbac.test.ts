import { describe, it, expect } from 'vitest';
import { getUserFromHeaders, requireAdmin, requireRole } from '../rbac';

describe('getUserFromHeaders', () => {
  it('extracts user id and role from headers', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-user-id': 'user-1', 'x-user-role': 'admin' },
    });
    const user = getUserFromHeaders(request);
    expect(user.id).toBe('user-1');
    expect(user.role).toBe('admin');
  });

  it('returns empty strings for missing headers', () => {
    const request = new Request('http://localhost');
    const user = getUserFromHeaders(request);
    expect(user.id).toBe('');
    expect(user.role).toBe('');
  });
});

describe('requireAdmin', () => {
  it('returns null for admin role', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-user-id': 'user-1', 'x-user-role': 'admin' },
    });
    const result = requireAdmin(request);
    expect(result).toBeNull();
  });

  it('returns 403 for non-admin role', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-user-id': 'user-1', 'x-user-role': 'receptionist' },
    });
    const result = requireAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('returns 403 when no role header', () => {
    const request = new Request('http://localhost');
    const result = requireAdmin(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

describe('requireRole', () => {
  it('returns null when role is in allowed list', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-user-role': 'receptionist' },
    });
    const result = requireRole(request, ['admin', 'receptionist']);
    expect(result).toBeNull();
  });

  it('returns 403 when role is not in allowed list', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-user-role': 'receptionist' },
    });
    const result = requireRole(request, ['admin']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('returns 403 when no role header', () => {
    const request = new Request('http://localhost');
    const result = requireRole(request, ['admin']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
