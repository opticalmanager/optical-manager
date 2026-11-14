"use server";

import { getCurrentUser } from "@/services/auth.service";
import { lookupGSTIN, TaxpayerLookupResult } from "@/services/gst-lookup.service";
import { db } from "@/lib/drizzle";
import { organizationAddons, addonUsageLogs } from "@/db/schema/addons";
import { eq, and } from "drizzle-orm";

// Sliding-window in-memory rate limiter per organization (30 lookups per 60 seconds)
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(orgId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;

  const timestamps = rateLimitMap.get(orgId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(orgId, validTimestamps);
  return true;
}

/**
 * Server Action: Verify GSTIN and Auto-fetch taxpayer details for Invoice Creation.
 * 1. Authenticates current user and organization context.
 * 2. Enforces organization add-on permission (GST_AUTOFETCH must be enabled).
 * 3. Enforces rate limits to protect external quota and avoid abuse.
 * 4. Calls 3-tier lookup service (Offline Luhn -> Local DB Cache -> Appyflow Live API).
 * 5. Logs query to addon_usage_logs for accounting and CA verification.
 */
export async function verifyGstinAction(gstinInput: string): Promise<TaxpayerLookupResult & { disabled?: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized: Please log in to perform GST verification.",
      };
    }

    let orgId = user.organizationId;
    if (!orgId && user.shopId) {
      const { shops } = await import("@/db/schema");
      const [shop] = await db
        .select({ organizationId: shops.organizationId })
        .from(shops)
        .where(eq(shops.id, user.shopId))
        .limit(1);
      if (shop?.organizationId) {
        orgId = shop.organizationId;
      }
    }

    const isSuperAdmin = user.role === "SUPER_ADMIN";

    let addonConfigCost = "0.40";

    // 1. Enforce organization add-on permission for regular tenants
    if (!isSuperAdmin) {
      if (!orgId) {
        return {
          success: false,
          error: "Unauthorized: No organization associated with this account.",
        };
      }

      const [addon] = await db
        .select()
        .from(organizationAddons)
        .where(
          and(
            eq(organizationAddons.organizationId, orgId),
            eq(organizationAddons.addonKey, "GST_AUTOFETCH")
          )
        )
        .limit(1);

      if (!addon || !addon.isEnabled) {
        return {
          success: false,
          disabled: true,
          error: "GST Auto-fetch add-on is disabled for your organization. Please contact your administrator.",
        };
      }

      const config = (addon.config as any) || {};
      addonConfigCost = config.costPerCall || "0.40";
    } else if (orgId) {
      const [addon] = await db
        .select()
        .from(organizationAddons)
        .where(
          and(
            eq(organizationAddons.organizationId, orgId),
            eq(organizationAddons.addonKey, "GST_AUTOFETCH")
          )
        )
        .limit(1);
      if (addon) {
        const config = (addon.config as any) || {};
        addonConfigCost = config.costPerCall || "0.40";
      }
    }

    // 2. Rate limit check
    const rateLimitKey = orgId || user.id || "super-admin";
    if (!checkRateLimit(rateLimitKey)) {
      return {
        success: false,
        error: "Rate limit exceeded (maximum 30 lookups per minute). Please wait a moment.",
      };
    }

    // 3. Execute 3-Tier Lookup
    const result = await lookupGSTIN(gstinInput);

    // 4. Log usage if successful
    if (result.success && result.data && orgId) {
      const costPerCall = result.data.isCached ? "0.00" : addonConfigCost;

      try {
        await db.insert(addonUsageLogs).values({
          organizationId: orgId,
          shopId: user.shopId || null,
          userId: user.id || null,
          addonKey: "GST_AUTOFETCH",
          referenceIdentifier: result.data.gstin,
          isCached: result.data.isCached,
          costInr: costPerCall,
          metadata: {
            tradeName: result.data.tradeName,
            status: result.data.status,
            city: result.data.city,
            state: result.data.state,
          },
        });
      } catch (logErr) {
        console.error("[GST Lookup Action] Failed to write usage log:", logErr);
      }
    }

    return result;
  } catch (err: any) {
    console.error("[GST Lookup Action] Server action error:", err);
    return {
      success: false,
      error: err?.message || "Internal server error while verifying GSTIN.",
    };
  }
}

/**
 * Server Action: Check if GST_AUTOFETCH add-on is enabled for the current user's organization.
 */
export async function checkGstAutofetchStatusAction(): Promise<{ isEnabled: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { isEnabled: false };
    }

    if (user.role === "SUPER_ADMIN") {
      return { isEnabled: true };
    }

    let orgId = user.organizationId;
    if (!orgId && user.shopId) {
      const { shops } = await import("@/db/schema");
      const [shop] = await db
        .select({ organizationId: shops.organizationId })
        .from(shops)
        .where(eq(shops.id, user.shopId))
        .limit(1);
      if (shop?.organizationId) {
        orgId = shop.organizationId;
      }
    }

    if (!orgId) {
      return { isEnabled: false };
    }

    const [addon] = await db
      .select({ isEnabled: organizationAddons.isEnabled })
      .from(organizationAddons)
      .where(
        and(
          eq(organizationAddons.organizationId, orgId),
          eq(organizationAddons.addonKey, "GST_AUTOFETCH")
        )
      )
      .limit(1);

    return { isEnabled: addon?.isEnabled || false };
  } catch (err) {
    console.error("[checkGstAutofetchStatusAction] Error:", err);
    return { isEnabled: false };
  }
}

