import { NextResponse } from "next/server";

export function getUserFromHeaders(request: Request) {
  return {
    id: request.headers.get("x-user-id") || "",
    role: request.headers.get("x-user-role") || "",
  };
}

export function requireAdmin(request: Request): NextResponse | null {
  const { role } = getUserFromHeaders(request);
  if (role !== "admin") {
    return NextResponse.json(
      { error: "Acceso denegado. Se requiere rol de administrador." },
      { status: 403 }
    );
  }
  return null;
}

export function requireRole(
  request: Request,
  roles: string[]
): NextResponse | null {
  const { role } = getUserFromHeaders(request);
  if (!roles.includes(role)) {
    return NextResponse.json(
      { error: "Acceso denegado." },
      { status: 403 }
    );
  }
  return null;
}
