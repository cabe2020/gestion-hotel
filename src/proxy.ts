import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/auth",
  "/_next",
  "/favicon",
  "/api/seed",
  "/api/auth",
  "/api/booking-engine",
  "/api/portal",
  "/api/cron",
  "/booking-engine",
  "/portal",
];

const ADMIN_ONLY_PAGES = ["/settings", "/reports", "/cash", "/audit-logs", "/channel-manager"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.includes(".svg") ||
    pathname.includes(".ico")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = token.role as string;

  if (pathname.startsWith("/api")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", token.id as string);
    requestHeaders.set("x-user-role", role);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const adminPage = ADMIN_ONLY_PAGES.find((p) => pathname.startsWith(p));
  if (adminPage && role !== "admin") {
    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("error", "Acceso denegado. Se requiere rol de administrador.");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
