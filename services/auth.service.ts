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
    let cachedSessionProfile: any = null;
    let activeShopContextId: string | undefined = undefined;

    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const optRaw = cookieStore.get("opt_session_profile")?.value;
      if (optRaw) {
        cachedSessionProfile = JSON.parse(optRaw.startsWith("%") ? decodeURIComponent(optRaw) : optRaw);
      }
      activeShopContextId = cookieStore.get("active_shop_context_id")?.value;
    } catch {}

    let authUser: any = null;
    try {
      const supabase = await createClient();
      const authPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Supabase auth timeout")), 500)
      );
      const { data: { user } } = (await Promise.race([authPromise, timeoutPromise])) as any;
      authUser = user;
    } catch (authErr) {
      // Offline mode or network timeout
    }

    // Fallback: extract user from session cookie if Supabase API was unreachable
    if (!authUser) {
      if (cachedSessionProfile?.id) {
        authUser = {
          id: cachedSessionProfile.id,
          email: cachedSessionProfile.email || "",
          user_metadata: {
            full_name: cachedSessionProfile.fullName,
            role: cachedSessionProfile.role,
            organization_id: cachedSessionProfile.organizationId,
            shop_id: cachedSessionProfile.shopId,
          },
        };
      } else {
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const allCookies = cookieStore.getAll();
          const authCookies = allCookies
            .filter((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))
            .sort((a, b) => a.name.localeCompare(b.name));

          if (authCookies.length > 0) {
            let combined = authCookies.map((c) => c.value).join("");
            let parsed: any = null;
            if (combined.startsWith("base64-")) {
              parsed = JSON.parse(Buffer.from(combined.slice(7), "base64").toString("utf-8"));
            } else {
              try {
                parsed = JSON.parse(combined);
              } catch {
                try {
                  parsed = JSON.parse(decodeURIComponent(combined));
                } catch {
                  parsed = { access_token: combined };
                }
              }
            }

            if (parsed?.user) {
              authUser = parsed.user;
            } else {
              const token = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
              if (token && typeof token === "string" && token.includes(".")) {
                const parts = token.split(".");
                if (parts.length >= 2) {
                  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
                  authUser = {
                    id: payload.sub,
                    email: payload.email,
                    user_metadata: payload.user_metadata || {},
                  };
                }
              }
            }
          }
        } catch (cookieErr: any) {
          if (cookieErr?.digest !== "DYNAMIC_SERVER_USAGE") {
            console.warn("[auth.service] Failed to extract offline user from cookies:", cookieErr);
          }
        }
      }
    }

    if (!authUser && !cachedSessionProfile) return null;

    let profile: any = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Profile DB query timeout")), 500)
      );
      const queryPromise = db
        .select()
        .from(profiles)
        .where(eq(profiles.id, authUser?.id || cachedSessionProfile?.id))
        .limit(1);
      const results = (await Promise.race([queryPromise, timeoutPromise])) as any[];
      profile = results[0] || null;
    } catch {
      // Offline fallback
    }

    if (!profile) {
      // If offline or profile lookup failed, use high-fidelity cached session profile
      if (cachedSessionProfile?.id) {
        return {
          id: cachedSessionProfile.id,
          email: cachedSessionProfile.email || authUser?.email || "",
          fullName: cachedSessionProfile.fullName || "User",
          role: cachedSessionProfile.role || "SHOP_MANAGER",
          customRoleName: null,
          permissions: null,
          organizationId: cachedSessionProfile.organizationId || "offline-org",
          shopId: activeShopContextId || cachedSessionProfile.shopId || null,
          avatarUrl: null,
          isActive: true,
          isImpersonating: Boolean(activeShopContextId),
        };
      }

      // Fallback synthesis from authUser metadata
      const email = authUser?.email || "";
      const fullName = authUser?.user_metadata?.full_name || email.split("@")[0] || "User";
      const metaRole = authUser?.user_metadata?.role || "SHOP_MANAGER";
      const metaOrgId = authUser?.user_metadata?.organization_id || "offline-org";
      const metaShopId = authUser?.user_metadata?.shop_id || null;

      return {
        id: authUser?.id,
        email,
        fullName,
        role: metaRole,
        customRoleName: null,
        permissions: null,
        organizationId: metaOrgId,
        shopId: activeShopContextId || metaShopId,
        avatarUrl: authUser?.user_metadata?.avatar_url || null,
        isActive: true,
        isImpersonating: Boolean(activeShopContextId),
      };
    }

    // Check if owner is active inside a shop branch context
    let roleOverride = profile.role;
    let shopIdOverride = profile.shopId;
    let isImpersonating = false;

    if (profile.role === "OWNER") {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const activeShopContextId = cookieStore.get("active_shop_context_id")?.value;

        if (activeShopContextId) {
          // Validate UUID format to prevent Drizzle/Postgres syntax errors on mock IDs
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(activeShopContextId)) {
            const { shops } = await import("@/db/schema");
            const { and } = await import("drizzle-orm");
            
            const dbShopPromise = db
              .select()
              .from(shops)
              .where(
                and(
                  eq(shops.id, activeShopContextId),
                  eq(shops.organizationId, profile.organizationId!)
                )
              )
              .limit(1);
            const timeoutPromise = new Promise<any[]>((_, reject) =>
              setTimeout(() => reject(new Error("Shop DB timeout")), 1500)
            );
            const [shop] = await Promise.race([dbShopPromise, timeoutPromise]);

            if (shop) {
              // Retain native OWNER role, but set active shop context ID
              shopIdOverride = shop.id;
              isImpersonating = true;
            }
          }
        }
      } catch (cookieErr) {
        console.error("[auth.service] Error checking active shop cookies:", cookieErr);
      }
    }

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: roleOverride,
      customRoleName: profile.customRoleName || null,
      permissions: profile.permissions || null,
      organizationId: profile.organizationId,
      shopId: shopIdOverride,
      avatarUrl: profile.avatarUrl,
      isActive: profile.isActive,
      isImpersonating,
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
