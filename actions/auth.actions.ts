"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createOwnerWithOrganization,
  profileExists,
} from "@/services/auth.service";
import { signupSchema, loginSchema, type FormState } from "@/utils/validators";

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

  redirect("/owner/dashboard");
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
