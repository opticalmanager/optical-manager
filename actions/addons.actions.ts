"use server";

import { db } from "@/lib/drizzle";
import { organizationAddons, addonUsageLogs } from "@/db/schema/addons";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifySuperAdmin } from "@/services/admin.service";
import { getCurrentUser } from "@/services/auth.service";

export interface AddonStatsResult {
  success: boolean;
  error?: string;
  isEnabled?: boolean;
  stats?: {
    totalQueries: number;
    liveCalls: number;
    cachedHits: number;
    totalCostInr: number;
    costPerCall: number;
    recentLogs: Array<{
      id: string;
      createdAt: string;
      gstin: string;
      tradeName: string;
      isCached: boolean;
      status: string;
      costInr: string;
    }>;
  };
}

/**
 * Super Admin Action: Toggle an add-on ON or OFF for an organization,
 * and optionally update configuration like cost per call.
 */
export async function toggleOrganizationAddonAction(params: {
  organizationId: string;
  addonKey: string;
  isEnabled: boolean;
  costPerCall?: string;
}): Promise<{ success: boolean; isEnabled?: boolean; error?: string }> {
  try {
    await verifySuperAdmin();

    const { organizationId, addonKey, isEnabled, costPerCall = "0.40" } = params;

    if (!organizationId || !addonKey) {
      return { success: false, error: "Missing organization ID or add-on key." };
    }

    await db
      .insert(organizationAddons)
      .values({
        organizationId,
        addonKey,
        isEnabled,
        config: { costPerCall },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [organizationAddons.organizationId, organizationAddons.addonKey],
        set: {
          isEnabled,
          config: { costPerCall },
          updatedAt: new Date(),
        },
      });

    revalidatePath(`/admin/organizations/${organizationId}`);

    return { success: true, isEnabled };
  } catch (err: any) {
    console.error("[Addons Action] Error toggling addon:", err);
    return { success: false, error: err?.message || "Failed to update add-on status." };
  }
}

/**
 * Fetch add-on usage analytics and billing breakdown for a specific date range.
 * Accessible by Super Admin or the Organization Owner.
 */
export async function getOrganizationAddonStatsAction(params: {
  organizationId: string;
  addonKey: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AddonStatsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const { organizationId, addonKey, fromDate, toDate } = params;

    // Security check: Only Super Admin or Organization Members can access
    if (user.role !== "SUPER_ADMIN" && user.organizationId !== organizationId) {
      return { success: false, error: "Forbidden: Access denied to organization metrics." };
    }

    // 1. Fetch Addon Enabled Status & Config
    const [addonRecord] = await db
      .select()
      .from(organizationAddons)
      .where(
        and(
          eq(organizationAddons.organizationId, organizationId),
          eq(organizationAddons.addonKey, addonKey)
        )
      )
      .limit(1);

    const isEnabled = addonRecord ? addonRecord.isEnabled : false;
    const config = (addonRecord?.config as any) || {};
    const costPerCall = parseFloat(config.costPerCall || "0.40") || 0.4;

    // 2. Query Usage Logs within date filter
    const conditions = [
      eq(addonUsageLogs.organizationId, organizationId),
      eq(addonUsageLogs.addonKey, addonKey),
    ];

    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(addonUsageLogs.createdAt, start));
    }

    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(addonUsageLogs.createdAt, end));
    }

    const logs = await db
      .select()
      .from(addonUsageLogs)
      .where(and(...conditions))
      .orderBy(desc(addonUsageLogs.createdAt))
      .limit(500);

    let liveCalls = 0;
    let cachedHits = 0;

    for (const log of logs) {
      if (log.isCached) {
        cachedHits++;
      } else {
        liveCalls++;
      }
    }

    const totalQueries = logs.length;
    const totalCostInr = parseFloat((liveCalls * costPerCall).toFixed(2));

    const recentLogs = logs.slice(0, 10).map((log) => {
      const meta = (log.metadata as any) || {};
      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        gstin: log.referenceIdentifier || "N/A",
        tradeName: meta.tradeName || "Unknown",
        isCached: log.isCached,
        status: meta.status || "Active",
        costInr: log.costInr,
      };
    });

    return {
      success: true,
      isEnabled,
      stats: {
        totalQueries,
        liveCalls,
        cachedHits,
        totalCostInr,
        costPerCall,
        recentLogs,
      },
    };
  } catch (err: any) {
    console.error("[Addons Action] Error fetching stats:", err);
    return { success: false, error: err?.message || "Failed to load add-on analytics." };
  }
}
