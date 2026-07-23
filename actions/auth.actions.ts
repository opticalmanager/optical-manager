"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createOwnerWithOrganization,
  profileExists,
  getCurrentUser,
} from "@/services/auth.service";
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, type FormState } from "@/utils/validators";

/**
 * Server Action: Sign up a new user.
 *
 * 1. Validate form data
 * 2. Create Supabase auth user
 * 3. Create organization + profile + trial subscription
 * 4. Redirect to onboarding
 */
export async function signup(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. Validate
  const validatedFields = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    organizationName: formData.get("organizationName"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { fullName, email, password, organizationName } =
    validatedFields.data;

  // 2. Create Supabase auth user
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError || !authData.user) {
    return {
      success: false,
      message: authError?.message ?? "Failed to create account.",
    };
  }

  // 3. Create organization + profile + trial subscription
  try {
    await createOwnerWithOrganization({
      userId: authData.user.id,
      email,
      fullName,
      organizationName,
    });
  } catch (error) {
    return {
      success: false,
      message: "Failed to set up your organization. Please try again.",
    };
  }

  // 4. Redirect to onboarding
  redirect("/onboarding");
}

/**
 * Server Action: Log in an existing user.
 * Routes to the correct dashboard based on the user's role.
 */
export async function login(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      message: "Invalid email or password.",
    };
  }

  // Fetch the profile to determine the user's role
  let user = await getCurrentUser();
  if (!user) {
    // If user is authenticated in Supabase but their PostgreSQL profile is missing
    // (typically due to a database reset/wipe in development), auto-recreate their records
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const email = authUser.email || "";
      const fullName = authUser.user_metadata?.full_name || email.split("@")[0] || "User";
      try {
        const created = await createOwnerWithOrganization({
          userId: authUser.id,
          email,
          fullName,
          organizationName: `${fullName}'s Organization`,
        });

        user = {
          id: authUser.id,
          email,
          fullName,
          role: "OWNER",
          organizationId: created.organization.id,
          shopId: null,
          avatarUrl: authUser.user_metadata?.avatar_url || null,
          isActive: true,
        };
      } catch (err) {
        console.error("Failed to auto-recreate profile:", err);
      }
    }
  }

  if (!user) {
    return {
      success: false,
      message: "Account profile not found. Please contact support.",
    };
  }

  // Deactivated account check
  if (!user.isActive) {
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Your account has been deactivated. Please contact platform support.",
    };
  }

  // Super Admin security guard on main site login
  if (user.role === "SUPER_ADMIN") {
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Access Restricted: Super Admin credentials must sign in via admin.opticalmanager.in.",
    };
  }

  // Role-based redirect
  if (user.role === "SHOP_MANAGER") {
    redirect("/shop/dashboard");
  }

  redirect("/owner");
}

/**
 * Server Action: Log out the current user.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Server Action: Sign in with Google OAuth.
 */
export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { success: false, message: "Failed to initiate Google sign-in." };
  }

  if (data.url) {
    redirect(data.url);
  }
}

/**
 * Server Action: Start viewing/managing a shop branch context.
 */
export async function accessShopConsoleAction(shopId: string) {
  // Set the active shop context cookie
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("active_shop_context_id", shopId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  return { success: true };
}

/**
 * Server Action: Exit shop console context.
 */
export async function exitShopConsoleAction() {
  // Clear the active shop context cookie
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete("active_shop_context_id");

  // Redirect back to owner dashboard
  redirect("/owner");
}

/**
 * Server Action: Send password recovery email.
 */
export async function sendPasswordResetEmail(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email } = validatedFields.data;
  
  try {
    const supabase = await createClient();
    const redirectToUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback?next=/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectToUrl,
    });

    if (error) {
      return {
        success: false,
        message: error.message || "Failed to send reset email. Please try again.",
      };
    }

    return {
      success: true,
      message: "A password reset link has been sent to your email address.",
    };
  } catch (err: any) {
    console.error("[sendPasswordResetEmail] error:", err);
    return {
      success: false,
      message: err?.message || "A connection timeout occurred. Please check your Supabase SMTP configuration.",
    };
  }
}

/**
 * Server Action: Update authenticated user's password.
 */
export async function updatePasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { password } = validatedFields.data;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      return {
        success: false,
        message: error.message || "Failed to update your password. Please try again.",
      };
    }

    return {
      success: true,
      message: "Your password has been successfully updated.",
    };
  } catch (err: any) {
    console.error("[updatePasswordAction] error:", err);
    return {
      success: false,
      message: err?.message || "An unexpected database connection error occurred.",
    };
  }
}

