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
  "/terms-of-service",
  "/sw.js",
  "/manifest.webmanifest",
  "/manifest.json",
];

export async function proxy(request: NextRequest) {
  const errorCode = request.nextUrl.searchParams.get("error_code");
  const errorParam = request.nextUrl.searchParams.get("error");
  
  if (errorCode === "otp_expired" || errorCode === "otp_disabled" || errorParam === "access_denied") {
    return NextResponse.redirect(new URL("/reset-password?error=expired", request.url));
  }

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

function extractOfflineUserFromCookies(request: NextRequest): any | null {
  try {
    // 1. Primary: Fast check for synced session profile cookie
    const optRaw = request.cookies.get("opt_session_profile")?.value;
    if (optRaw) {
      try {
        const opt = JSON.parse(optRaw.startsWith("%") ? decodeURIComponent(optRaw) : optRaw);
        if (opt?.id) {
          return {
            id: opt.id,
            email: opt.email || "",
            user_metadata: {
              full_name: opt.fullName,
              role: opt.role,
              organization_id: opt.organizationId,
              shop_id: opt.shopId,
            },
            app_metadata: {},
          };
        }
      } catch {}
    }

    // 2. Secondary: Parse Supabase JWT tokens from sb-*-auth-token cookies
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies
      .filter((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (authCookies.length === 0) return null;

    let combinedValue = authCookies.map((c) => c.value).join("");
    if (!combinedValue) return null;

    let parsed: any = null;
    if (combinedValue.startsWith("base64-")) {
      const base64Str = combinedValue.slice(7);
      const decodedStr = Buffer.from(base64Str, "base64").toString("utf-8");
      parsed = JSON.parse(decodedStr);
    } else {
      try {
        parsed = JSON.parse(combinedValue);
      } catch {
        try {
          parsed = JSON.parse(decodeURIComponent(combinedValue));
        } catch {
          parsed = { access_token: combinedValue };
        }
      }
    }

    if (parsed?.user) {
      return parsed.user;
    }

    const token = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
    if (token && typeof token === "string" && token.includes(".")) {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadStr);
        return {
          id: payload.sub,
          email: payload.email,
          user_metadata: payload.user_metadata || {},
          app_metadata: payload.app_metadata || {},
        };
      }
    }
  } catch (err) {
    console.warn("[proxy] Failed to parse offline session from cookies:", err);
  }
  return null;
}

  let user = null;
  let isOfflineAuth = false;

  try {
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase auth timeout")), 500)
    );
    const { data: { user: authUser }, error } = (await Promise.race([
      authPromise,
      timeoutPromise,
    ])) as any;

    if (error) {
      // Clear stale/corrupted cookies when Supabase explicitly returns invalid token errors
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
    // Fast offline fallback when Supabase network fails or times out
    const offlineUser = extractOfflineUserFromCookies(request);
    if (offlineUser) {
      user = offlineUser;
      isOfflineAuth = true;
    }
  }

  // Secondary fallback: if getUser returned null due to offline connection failure
  if (!user) {
    const offlineUser = extractOfflineUserFromCookies(request);
    if (offlineUser) {
      user = offlineUser;
      isOfflineAuth = true;
    }
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
    (route) =>
      pathname === route ||
      pathname.startsWith("/api/auth/") ||
      pathname.startsWith("/book/") ||
      pathname.startsWith("/share/") ||
      pathname.startsWith("/icons/") ||
      pathname === "/sw.js" ||
      pathname === "/manifest.webmanifest" ||
      pathname === "/manifest.json"
  );

  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
    const role = user.user_metadata?.role;
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (role === "OWNER") {
      return NextResponse.redirect(new URL("/owner", request.url));
    }
    return NextResponse.redirect(new URL("/shop/dashboard", request.url));
  }

  if (isOfflineAuth) {
    supabaseResponse.headers.set("x-offline-session", "1");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|manifest.json|sw.js|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
