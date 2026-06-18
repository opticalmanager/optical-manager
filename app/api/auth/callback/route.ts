import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createOwnerWithOrganization,
  profileExists,
} from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * OAuth callback handler for Supabase.
 *
 * After Google OAuth redirect, Supabase sends the user here with a code.
 * We exchange the code for a session, and create a profile if it's a new user.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Check if profile exists and get their role
  const [profile] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, data.user.id))
    .limit(1);

  if (!profile) {
    // New user via OAuth — create organization and profile
    const fullName =
      data.user.user_metadata?.full_name ??
      data.user.email?.split("@")[0] ??
      "User";
    const email = data.user.email ?? "";

    await createOwnerWithOrganization({
      userId: data.user.id,
      email,
      fullName,
      organizationName: `${fullName}'s Organization`,
    });

    // Redirect to onboarding for new users
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // Redirect based on role unless next redirect is specified
  let targetPath = profile.role === "SHOP_MANAGER" ? "/shop/dashboard" : "/owner";
  if (next && next.startsWith("/")) {
    targetPath = next;
  }
  return NextResponse.redirect(`${origin}${targetPath}`);
}

