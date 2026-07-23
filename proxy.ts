import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 Proxy Middleware
 *
 * Handles auth session refresh, domain subroutines, and route protection.
 * - Public routes: /, /login, /signup, /admin/login, /api/auth/callback, /book/*, /share/*
 * - Super Admin subdomain (admin.opticalmanager.in): 
 *     - Strictly enforced: /admin/* is ONLY accessible when requested via admin.* subdomain
 *     - If logged in as SUPER_ADMIN: / maps to /admin
 *     - If unauthenticated: / maps to /admin/login
 * - Protected tenant routes: /shop/*, /owner/*
 */

const publicRoutes = [
  "/", 
  "/login", 
  "/signup", 
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
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) {
      // Clear stale/corrupted cookies when Supabase returns refresh_token_not_found or 400 auth errors
      if (error.code === "refresh_token_not_found" || error.status === 400 || error.name === "AuthApiError") {
        const allCookies = request.cookies.getAll();
        allCookies.forEach((cookie) => {
          if (cookie.name.includes("auth-token") || cookie.name.startsWith("sb-")) {
            supabaseResponse.cookies.delete(cookie.name);
          }
        });
      }
    } else {
      user = authUser;
    }
  } catch (err) {
    console.error("[proxy] Supabase auth check failed:", err);
  }

  const { pathname } = request.nextUrl;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";
  const isAdminSubdomain = host.startsWith("admin.") || forwardedHost?.startsWith("admin.");

  const isSuperAdmin = user?.user_metadata?.role === "SUPER_ADMIN";

  // Subdomain rewrite for admin.opticalmanager.in
  if (isAdminSubdomain && pathname === "/") {
    if (isSuperAdmin) {
      return NextResponse.rewrite(new URL("/admin", request.url));
    } else {
      return NextResponse.rewrite(new URL("/admin/login", request.url));
    }
  }

  // Handle Admin routes (/admin/*)
  if (pathname.startsWith("/admin")) {
    // ENFORCE SUBDOMAIN ONLY: If accessed via main domain (opticalmanager.in or www.opticalmanager.in), block or redirect to admin subdomain
    if (!isAdminSubdomain) {
      if (host.includes("opticalmanager.in")) {
        return NextResponse.redirect(new URL(`https://admin.opticalmanager.in`, request.url));
      } else {
        // Local dev fallback if accessed via localhost:3000/admin instead of admin.lvh.me:3000
        return NextResponse.redirect(new URL("http://admin.lvh.me:3000/admin/login", request.url));
      }
    }

    if (pathname === "/admin/login") {
      if (isSuperAdmin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return supabaseResponse;
    }

    // Guard all other /admin routes on admin subdomain
    if (!user || !isSuperAdmin) {
      const loginUrl = new URL("/admin/login", request.url);
      if (user && !isSuperAdmin) {
        loginUrl.searchParams.set("error", "unauthorized");
      }
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
    const role = user.user_metadata?.role;
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (role === "SHOP_MANAGER") {
      return NextResponse.redirect(new URL("/shop/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/owner", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
