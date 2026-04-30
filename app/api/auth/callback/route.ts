import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createOwnerWithOrganization,
  profileExists,
} from "@/services/auth.service";

/**
 * OAuth callback handler for Supabase.
 *
 * After Google OAuth redirect, Supabase sends the user here with a code.
 * We exchange the code for a session, and create a profile if it's a new user.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/owner/dashboard";

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
        setAll(cookiesToSet) {
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

  // Check if profile already exists
  const hasProfile = await profileExists(data.user.id);

  if (!hasProfile) {
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

  return NextResponse.redirect(`${origin}${next}`);
}
