"use server";

import { db } from "@/lib/drizzle";
import { getCurrentUser } from "@/services/auth.service";
import { 
  customers, 
  shops, 
  whatsappDispatchQueue, 
  promotionCampaigns 
} from "@/db/schema";
import { eq, and, inArray, gte, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { 
  getGrowthOpportunitiesData, 
  generateAiCampaignCopy,
  sanitizeWhatsAppPhone 
} from "@/services/ai-growth.service";
import { checkDesktopAssistantStatusAction } from "@/actions/desktop-wa.actions";
import { getShopsByOrganization } from "@/services/shop.service";
import type {
  GrowthCohortCategory,
  CampaignRefinementOptions,
  DispatchGrowthBroadcastPayload,
  DispatchGrowthBroadcastResult,
} from "@/types/ai-growth";

/**
 * Server Action: Fetches the AI Growth Copilot dashboard data including
 * the 6 opportunity cohorts, aggregate telemetry, and multi-branch options.
 */
export async function fetchGrowthDashboardAction(shopId?: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized access" };
    }

    const orgId = user.organizationId;
    const targetShopId = shopId && shopId !== "ALL" ? shopId : undefined;

    // 1. Fetch Shops for Branch Selector
    const allShops = await getShopsByOrganization(orgId);

    // 2. Resolve Active Shop for Desktop Status Gate
    const effectiveShopId = targetShopId || user.shopId || allShops[0]?.id;
    const desktopStatus = effectiveShopId
      ? await checkDesktopAssistantStatusAction(effectiveShopId)
      : { isOnline: false, isWaConnected: false, status: "OFFLINE" as const, pendingCount: 0 };

    // 3. Single-Pass Aggregation & Cohorting
    const growthData = await getGrowthOpportunitiesData(orgId, targetShopId);

    // 4. Bind Live WhatsApp Desktop Health
    growthData.telemetry.whatsappStatus = desktopStatus.status;
    growthData.telemetry.connectedPhone = desktopStatus.connectedPhone || null;

    return {
      success: true,
      data: {
        telemetry: growthData.telemetry,
        cards: growthData.cards,
        shops: allShops.map((s) => ({ id: s.id, name: s.name })),
        activeShopId: targetShopId || "ALL",
        desktopAssistant: desktopStatus,
      },
    };
  } catch (error: any) {
    console.error("fetchGrowthDashboardAction Error:", error);
    return {
      success: false,
      error: error.message || "Failed to load AI Growth dashboard",
    };
  }
}

/**
 * Server Action: Fetches the roster of patients for a specific cohort.
 * Used by the CohortPatientsDrawer slide-over.
 */
export async function fetchCohortPatientsAction(
  cohortType: GrowthCohortCategory,
  shopId?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized access" };
    }

    const orgId = user.organizationId;
    const targetShopId = shopId && shopId !== "ALL" ? shopId : undefined;

    const { patientsByCohort } = await getGrowthOpportunitiesData(orgId, targetShopId);
    const patients = patientsByCohort[cohortType] || [];

    return {
      success: true,
      patients,
    };
  } catch (error: any) {
    console.error("fetchCohortPatientsAction Error:", error);
    return {
      success: false,
      error: error.message || "Failed to load cohort patients",
    };
  }
}

/**
 * Server Action: Dispatches 1-Click WhatsApp Broadcast to selected patients.
 * Enforces:
 * 1. E.164 phone sanitization (skips landlines / malformed numbers).
 * 2. Multi-branch shopId binding (injects correct branch metadata).
 * 3. Humanized Jitter Pacing (3.5s - 6.8s randomized delay per message).
 * 4. Tracking campaign record in `promotion_campaigns`.
 */
export async function dispatchGrowthBroadcastAction(
  payload: DispatchGrowthBroadcastPayload
): Promise<DispatchGrowthBroadcastResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return {
        success: false,
        enqueuedCount: 0,
        skippedCount: 0,
        cooldownSkippedCount: 0,
        invalidPhoneSkippedCount: 0,
        isDesktopOnline: false,
        estimatedDeliveryTimeSeconds: 0,
        error: "Unauthorized",
      };
    }

    if (!payload.patientIds || payload.patientIds.length === 0) {
      return {
        success: false,
        enqueuedCount: 0,
        skippedCount: 0,
        cooldownSkippedCount: 0,
        invalidPhoneSkippedCount: 0,
        isDesktopOnline: false,
        estimatedDeliveryTimeSeconds: 0,
        error: "Please select at least one patient to broadcast.",
      };
    }

    // 1. Resolve Target Shop
    let shopId = payload.shopId && payload.shopId !== "ALL" ? payload.shopId : user.shopId;
    if (!shopId) {
      const [firstShop] = await db
        .select({ id: shops.id, name: shops.name })
        .from(shops)
        .where(eq(shops.organizationId, user.organizationId))
        .limit(1);
      shopId = firstShop?.id;
    }

    if (!shopId) {
      return {
        success: false,
        enqueuedCount: 0,
        skippedCount: 0,
        cooldownSkippedCount: 0,
        invalidPhoneSkippedCount: 0,
        isDesktopOnline: false,
        estimatedDeliveryTimeSeconds: 0,
        error: "Active shop could not be resolved for dispatch routing.",
      };
    }

    // 1b. Fetch all organization shops to resolve branch-specific metadata dynamically
    const orgShops = await db
      .select({ id: shops.id, name: shops.name, phone: shops.phone, address: shops.address })
      .from(shops)
      .where(eq(shops.organizationId, user.organizationId));

    const shopsMap = new Map<string, { id: string; name: string; phone: string | null; address: string | null }>();
    for (const s of orgShops) {
      shopsMap.set(s.id, s);
    }
    const defaultShop = shopsMap.get(shopId) || orgShops[0];

    // 2. Check Desktop Assistant Status Gate
    const desktopStatus = await checkDesktopAssistantStatusAction(shopId);

    // 3. Fetch Selected Customers from Database
    const selectedCustomers = await db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        storeCredit: customers.storeCredit,
        shopId: customers.shopId,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, user.organizationId),
          inArray(customers.id, payload.patientIds)
        )
      );

    if (selectedCustomers.length === 0) {
      return {
        success: false,
        enqueuedCount: 0,
        skippedCount: 0,
        cooldownSkippedCount: 0,
        invalidPhoneSkippedCount: 0,
        isDesktopOnline: desktopStatus.isOnline,
        estimatedDeliveryTimeSeconds: 0,
        error: "None of the selected patients were found in the database.",
      };
    }

    // 4. Server-Side Anti-Fatigue Shield Verification (14-Day Cooldown)
    const shouldEnforceCooldown = payload.enforceAntiFatigue !== false;
    const cooldownPhoneSet = new Set<string>();

    if (shouldEnforceCooldown) {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const recentDispatches = await db
        .select({ recipientPhone: whatsappDispatchQueue.recipientPhone })
        .from(whatsappDispatchQueue)
        .where(
          and(
            eq(whatsappDispatchQueue.organizationId, user.organizationId),
            gte(whatsappDispatchQueue.createdAt, fourteenDaysAgo),
            notInArray(whatsappDispatchQueue.status, ["FAILED", "CANCELLED", "HEARTBEAT", "COMMAND"])
          )
        );

      for (const item of recentDispatches) {
        if (!item.recipientPhone) continue;
        const clean = item.recipientPhone.replace(/\D/g, "");
        if (clean) {
          cooldownPhoneSet.add(clean);
          if (clean.length >= 10) {
            cooldownPhoneSet.add(clean.slice(-10));
          }
        }
      }
    }

    // 5. Create Promotion Campaign Record for Tracking
    const campaignName = payload.campaignName || 
      `${payload.cohortType.replace(/_/g, " ")} Broadcast (${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;

    const [campaign] = await db
      .insert(promotionCampaigns)
      .values({
        organizationId: user.organizationId,
        shopId: shopId,
        name: campaignName,
        offerDetails: payload.offerDetails || "AI Growth Copilot Suggestion",
        audience: payload.cohortType,
        audienceCount: selectedCustomers.length,
        scheduledAt: new Date(),
        status: "SCHEDULED",
        totalSent: 0,
        delivered: 0,
        read: 0,
        replied: 0,
      })
      .returning({ id: promotionCampaigns.id });

    // 6. Enqueue Messages with Randomized Jitter Pacing (3.5s - 6.8s Stagger)
    let enqueuedCount = 0;
    let invalidPhoneSkippedCount = 0;
    let cooldownSkippedCount = 0;
    let cumulativeJitterMs = 0;
    const now = Date.now();

    const insertQueueItems: Array<{
      organizationId: string;
      shopId: string;
      recipientPhone: string;
      recipientName: string;
      messageText: string;
      mediaUrl: null;
      mediaType: string;
      templateKey: string;
      metadata: Record<string, any>;
      status: string;
    }> = [];

    for (const customer of selectedCustomers) {
      const phoneValidation = sanitizeWhatsAppPhone(customer.phone);
      if (!phoneValidation.isValid) {
        invalidPhoneSkippedCount++;
        continue;
      }

      // Check anti-fatigue cooldown
      if (shouldEnforceCooldown) {
        const cleanDigits = phoneValidation.digits;
        const suffix10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : "";
        if (cooldownPhoneSet.has(cleanDigits) || (suffix10 && cooldownPhoneSet.has(suffix10))) {
          cooldownSkippedCount++;
          continue;
        }
      }

      // Resolve branch-specific home store details
      const customerShopId = customer.shopId || shopId;
      const targetShop = shopsMap.get(customerShopId) || defaultShop;
      const storeName = targetShop?.name || "Our Optical Store";

      // Calculate randomized jitter interval between 3500ms and 6800ms
      const jitterMs = Math.floor(Math.random() * (6800 - 3500 + 1)) + 3500;
      cumulativeJitterMs += jitterMs;
      const scheduledTime = new Date(now + cumulativeJitterMs);

      // Interpolate placeholders
      const customerName = customer.fullName || "Valued Customer";
      const storeCreditFormatted = customer.storeCredit ? Math.round(parseFloat(customer.storeCredit)).toString() : "0";

      let finalMessage = payload.messageTemplate
        .replace(/\{\{\s*customer_name\s*\}\}/gi, customerName)
        .replace(/\{\{\s*shop_name\s*\}\}/gi, storeName)
        .replace(/\{\{\s*store_credit\s*\}\}/gi, storeCreditFormatted);

      insertQueueItems.push({
        organizationId: user.organizationId,
        shopId: customerShopId,
        recipientPhone: phoneValidation.digits,
        recipientName: customerName,
        messageText: finalMessage,
        mediaUrl: null,
        mediaType: "TEXT",
        templateKey: `ai_growth_${payload.cohortType.toLowerCase()}`,
        metadata: {
          campaignId: campaign?.id,
          cohortType: payload.cohortType,
          scheduledAt: scheduledTime.toISOString(),
          jitterOffsetMs: cumulativeJitterMs,
          source: "AI_GROWTH_COPILOT",
        },
        status: "PENDING",
      });

      enqueuedCount++;
    }

    if (insertQueueItems.length > 0) {
      // Chunk inserts in batches of 50 to prevent parameter limit issues
      const CHUNK_SIZE = 50;
      for (let i = 0; i < insertQueueItems.length; i += CHUNK_SIZE) {
        const chunk = insertQueueItems.slice(i, i + CHUNK_SIZE);
        await db.insert(whatsappDispatchQueue).values(chunk as any);
      }

      // Update campaign record totalSent count
      if (campaign?.id) {
        await db
          .update(promotionCampaigns)
          .set({
            totalSent: enqueuedCount,
            audienceCount: enqueuedCount,
            updatedAt: new Date(),
          })
          .where(eq(promotionCampaigns.id, campaign.id));
      }
    }

    revalidatePath("/owner/promotions");

    return {
      success: true,
      campaignId: campaign?.id,
      enqueuedCount,
      skippedCount: selectedCustomers.length - enqueuedCount,
      cooldownSkippedCount,
      invalidPhoneSkippedCount,
      isDesktopOnline: desktopStatus.isOnline,
      estimatedDeliveryTimeSeconds: Math.round(cumulativeJitterMs / 1000),
    };
  } catch (error: any) {
    console.error("dispatchGrowthBroadcastAction Error:", error);
    return {
      success: false,
      enqueuedCount: 0,
      skippedCount: 0,
      cooldownSkippedCount: 0,
      invalidPhoneSkippedCount: 0,
      isDesktopOnline: false,
      estimatedDeliveryTimeSeconds: 0,
      error: error.message || "Failed to dispatch broadcast campaign",
    };
  }
}

/**
 * Server Action: Uses Gemini 3.5 Flash to tune campaign copy,
 * adhering to clinical optometric ethics and store discount caps.
 */
export async function refineGrowthCopyAction(options: CampaignRefinementOptions) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized access" };
    }

    const refined = await generateAiCampaignCopy(user.organizationId, options);
    return {
      success: true,
      data: refined,
    };
  } catch (error: any) {
    console.error("refineGrowthCopyAction Error:", error);
    return {
      success: false,
      error: error.message || "Failed to refine campaign copy with AI",
    };
  }
}
