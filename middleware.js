// middleware.ts (na RAIZ)
import { NextResponse } from "next/server";

const PUBLIC = [
  "/signup",
  "/login",
  "/verify",
  "/api/otp",
  "/api/auth",
  "/api/test-email-direct",
  "/api/debug",
  "/api/email-diagnostics",
  "/api/test-multiple-emails",
  "/api/email-help",
  "/api/system-status",
  "/_next",
  "/favicon.ico",
];

function isPublic(path) {
  return PUBLIC.some(p => path === p || path.startsWith(p + "/"));
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const session = req.cookies.get("session")?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
