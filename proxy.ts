import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const CUSTOMER_ROUTES = ["/dashboard", "/shipments", "/book", "/profile", "/payment"];

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;

  // Keep the response so refreshed Supabase auth cookies propagate.
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- Customer area: require a Supabase session ----
  if (CUSTOMER_ROUTES.some((p) => url.pathname.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Already logged in → skip the auth pages.
  if ((url.pathname === "/login" || url.pathname === "/signup") && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ---- Admin area: separate cookie-based session ----
  const adminSession = req.cookies.get("admin_session")?.value;
  if (url.pathname.startsWith("/admin") && !url.pathname.startsWith("/admin/login")) {
    if (adminSession !== "authenticated") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  if (url.pathname.startsWith("/admin/login") && adminSession === "authenticated") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/shipments/:path*",
    "/book/:path*",
    "/profile/:path*",
    "/payment/:path*",
    "/login",
    "/signup",
  ],
};
