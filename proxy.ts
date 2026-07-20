import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 Proxy Middleware
 *
 * Handles auth session refresh, domain subroutines, and route protection.
 * - Public routes: /, /login, /signup, /admin/login, /api/auth/callback, /book/*, /share/*
 * - Super Admin routes: /admin/* (strictly guarded for role === 'SUPER_ADMIN')
 * - Protected tenant routes: /shop/*, /owner/*
 */

const publicRoutes = [
  "/", 
  "/login", 
  "/signup", 
  "/admin/login",
  "/api/auth/callback", 
  "/forgot-password", 
  "/reset-password", 
  "/privacy-policy", 
  "/terms-of-service"
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;
  } catch (err) {
    console.error("[proxy] Supabase connection failed:", err);
  }

  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const isAdminSubdomain = host.startsWith("admin.");

  // If request arrives on admin.opticalmanager.in subdomain, rewrite root / to /admin
  if (isAdminSubdomain && pathname === "/") {
    return NextResponse.rewrite(new URL("/admin", request.url));
  }

  // Handle Admin routes (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (user) {
        // If already logged in, check role
        const role = user.user_metadata?.role;
        if (role === "SUPER_ADMIN") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
      return supabaseResponse;
    }

    // Guard all other /admin routes
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const role = user.user_metadata?.role;
    if (role !== "SUPER_ADMIN") {
      // Non-admin attempting to access admin portal
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  // Allow public routes
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/api/auth/") || pathname.startsWith("/book/") || pathname.startsWith("/share/")
  );

  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/owner", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
