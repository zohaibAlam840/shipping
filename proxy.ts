import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const adminSession = req.cookies.get("admin_session")?.value;

  // Protect all /admin routes, except the login page itself
  if (url.pathname.startsWith("/admin") && !url.pathname.startsWith("/admin/login")) {
    if (adminSession !== "authenticated") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // If already logged in, redirect away from the login page
  if (url.pathname.startsWith("/admin/login")) {
    if (adminSession === "authenticated") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
