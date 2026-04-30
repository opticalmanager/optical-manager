"use server";

import { db } from "@/lib/drizzle";
import { profiles, organizations, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types";
import { TRIAL_DURATION_DAYS } from "@/utils/constants";
import { slugify } from "@/lib/utils";

/**
 * Fetches the current user's profile from the database.
 * Uses auth.uid() from Supabase to look up the profile.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
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

  if (!profile) return null;

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
}

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
