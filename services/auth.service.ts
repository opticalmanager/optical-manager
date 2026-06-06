"use server";

import { db } from "@/lib/drizzle";
import { profiles, organizations, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types";
import { TRIAL_DURATION_DAYS } from "@/utils/constants";
import { slugify } from "@/lib/utils";

import { cache } from "react";

/**
 * Fetches the current user's profile from the database.
 * Uses auth.uid() from Supabase to look up the profile.
 * Cached to prevent multiple Supabase session roundtrips per page/layout render.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (!profile) {
      // If the database was reset/wiped in development but they have a valid Supabase session,
      // auto-recreate their profile as an OWNER so they don't get stuck in a redirect loop.
      const email = user.email || "";
      const fullName = user.user_metadata?.full_name || email.split("@")[0] || "User";
      try {
        console.log(`[auth.service] Profile missing for ${email}. Auto-recreating owner profile...`);
        const created = await createOwnerWithOrganization({
          userId: user.id,
          email,
          fullName,
          organizationName: `${fullName}'s Organization`,
        });

        return {
          id: user.id,
          email,
          fullName,
          role: "OWNER",
          organizationId: created.organization.id,
          shopId: null,
          avatarUrl: user.user_metadata?.avatar_url || null,
          isActive: true,
        };
      } catch (err) {
        console.error("[auth.service] Failed to auto-recreate profile in getCurrentUser:", err);
        return null;
      }
    }

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      organizationId: profile.organizationId,
      shopId: profile.shopId,
      avatarUrl: profile.avatarUrl,
      isActive: profile.isActive,
    };
  } catch (error) {
    console.error("[auth.service] Error in getCurrentUser:", error);
    return null;
  }
});

/**
 * Creates a new organization, profile, and trial subscription
 * during the signup flow.
 */
export async function createOwnerWithOrganization({
  userId,
  email,
  fullName,
  organizationName,
}: {
  userId: string;
  email: string;
  fullName: string;
  organizationName: string;
}) {
  // Create organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: organizationName,
      slug: slugify(organizationName),
      email,
    })
    .returning();

  // Create profile linked to auth user
  const [profile] = await db
    .insert(profiles)
    .values({
      id: userId,
      organizationId: org.id,
      fullName,
      email,
      role: "OWNER",
    })
    .returning();

  // Create trial subscription
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

  await db.insert(subscriptions).values({
    organizationId: org.id,
    plan: "TRIAL",
    status: "ACTIVE",
    trialEndsAt,
    currentPeriodStart: new Date(),
    currentPeriodEnd: trialEndsAt,
  });

  return { organization: org, profile };
}

/**
 * Checks if a user profile exists for a given auth user ID.
 */
export async function profileExists(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return !!profile;
}
