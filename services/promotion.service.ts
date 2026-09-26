"use server";

import { db } from "@/lib/drizzle";
import { 
  whatsappConfigs, 
  whatsappTemplates, 
  promotionTriggers, 
  promotionCampaigns,
  whatsappDispatchQueue,
} from "@/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";

export interface PromotionTelemetry {
  totalSent: number;
  delivered: number;
  read: number;
  replied: number;
}

export interface PromotionOverviewData {
  whatsappStatus: "CONNECTED" | "DISCONNECTED" | "PENDING";
  providerType?: "META_CLOUD_API" | "TWILIO" | "QR_GATEWAY";
  phoneNumber?: string;
  businessName?: string;
  activeTemplatesCount: number;
  activeTriggersCount: number;
  upcomingCampaignsCount: number;
  telemetry: PromotionTelemetry;
  recentCampaigns: Array<{
    id: string;
    name: string;
    offerDetails: string;
    audience: string;
    scheduledOn: string;
    status: "SCHEDULED" | "COMPLETED" | "DRAFT" | "CANCELLED";
  }>;
  activeTriggers: Array<{
    id: string;
    name: string;
    description: string;
    category: "BIRTHDAY" | "PURCHASE" | "APPOINTMENT" | "RE_ENGAGEMENT";
    nextRun: string;
    status: "ACTIVE" | "PAUSED" | "INACTIVE";
  }>;
}

export async function getPromotionDashboardData(orgId: string): Promise<PromotionOverviewData> {
  try {
    if (!orgId) {
      return getFallbackData("DISCONNECTED");
    }

    // 1. Check live Desktop Assistant Heartbeat (< 45s threshold with isWaConnected === true)
    const fortyFiveSecondsAgo = new Date(Date.now() - 45 * 1000);
    const liveHeartbeatRows = await db
      .select({
        status: whatsappDispatchQueue.status,
        metadata: whatsappDispatchQueue.metadata,
        updatedAt: whatsappDispatchQueue.updatedAt,
      })
      .from(whatsappDispatchQueue)
      .where(
        and(
          eq(whatsappDispatchQueue.organizationId, orgId),
          eq(whatsappDispatchQueue.status, "HEARTBEAT"),
          gt(whatsappDispatchQueue.updatedAt, fortyFiveSecondsAgo)
        )
      )
      .orderBy(desc(whatsappDispatchQueue.updatedAt))
      .limit(1)
      .catch(() => []);

    const liveHeartbeat = liveHeartbeatRows[0];
    const liveMeta: any = liveHeartbeat?.metadata || null;
    const isAssistantConnected = Boolean(liveMeta?.isAlive && liveMeta?.isWaConnected);
    const assistantPhone = isAssistantConnected && liveMeta?.connectedPhone ? String(liveMeta.connectedPhone) : undefined;

    // 2. Fetch Stored Config from DB
    const configRows = await db
      .select()
      .from(whatsappConfigs)
      .where(eq(whatsappConfigs.organizationId, orgId))
      .limit(1)
      .catch(() => []);

    const config = configRows[0];

    // Priority: Live Desktop Assistant connection -> Stored config -> DISCONNECTED
    let whatsappStatus: "CONNECTED" | "DISCONNECTED" | "PENDING" = "DISCONNECTED";
    let phoneNumber: string | undefined = undefined;
    let providerType: "META_CLOUD_API" | "TWILIO" | "QR_GATEWAY" = "QR_GATEWAY";

    if (isAssistantConnected) {
      whatsappStatus = "CONNECTED";
      phoneNumber = assistantPhone ? (assistantPhone.startsWith("+") ? assistantPhone : `+${assistantPhone}`) : undefined;
      providerType = "QR_GATEWAY";
    } else if (config?.status === "CONNECTED") {
      whatsappStatus = "CONNECTED";
      phoneNumber = config.phoneNumber || undefined;
      providerType = config.apiKey ? "META_CLOUD_API" : "QR_GATEWAY";
    } else {
      whatsappStatus = "DISCONNECTED";
    }

    // 2. Fetch Counts & Tables from DB
    const templates = await db
      .select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.organizationId, orgId))
      .catch(() => []);

    const triggers = await db
      .select()
      .from(promotionTriggers)
      .where(eq(promotionTriggers.organizationId, orgId))
      .catch(() => []);

    const campaigns = await db
      .select()
      .from(promotionCampaigns)
      .where(eq(promotionCampaigns.organizationId, orgId))
      .orderBy(desc(promotionCampaigns.scheduledAt))
      .catch(() => []);

    const activeTemplatesCount = templates.filter((t) => t.status === "APPROVED").length;
    const activeTriggersCount = triggers.filter((t) => t.status === "ACTIVE").length;
    const upcomingCampaignsCount = campaigns.filter((c) => c.status === "SCHEDULED").length;

    // Telemetry totals
    let totalSent = 0;
    let delivered = 0;
    let read = 0;
    let replied = 0;

    if (campaigns.length > 0) {
      totalSent = campaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0);
      delivered = campaigns.reduce((acc, c) => acc + (c.delivered || 0), 0);
      read = campaigns.reduce((acc, c) => acc + (c.read || 0), 0);
      replied = campaigns.reduce((acc, c) => acc + (c.replied || 0), 0);
    }

    // Display Campaigns
    const displayCampaigns = campaigns.slice(0, 5).map((c) => ({
      id: c.id,
      name: c.name,
      offerDetails: c.offerDetails || "Special promotional offer",
      audience: c.audience,
      scheduledOn: c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A",
      status: c.status as any,
    }));

    const displayTriggers = triggers.slice(0, 5).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || `Trigger for ${t.event.toLowerCase()}`,
      category: t.event as any,
      nextRun: t.nextRunAt ? new Date(t.nextRunAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Tomorrow, 09:00 AM",
      status: t.status as any,
    }));

    return {
      whatsappStatus: whatsappStatus as any,
      providerType: providerType,
      phoneNumber: phoneNumber || config?.phoneNumber || undefined,
      businessName: config?.businessName || undefined,
      activeTemplatesCount: activeTemplatesCount || 0,
      activeTriggersCount: activeTriggersCount || 0,
      upcomingCampaignsCount: upcomingCampaignsCount || 0,
      telemetry: {
        totalSent,
        delivered,
        read,
        replied,
      },
      recentCampaigns: displayCampaigns,
      activeTriggers: displayTriggers,
    };
  } catch (error) {
    console.error("[getPromotionDashboardData] Error:", error);
    return getFallbackData("DISCONNECTED");
  }
}

function getFallbackData(status: "CONNECTED" | "DISCONNECTED" = "DISCONNECTED"): PromotionOverviewData {
  return {
    whatsappStatus: status,
    phoneNumber: undefined,
    activeTemplatesCount: 0,
    activeTriggersCount: 0,
    upcomingCampaignsCount: 0,
    telemetry: {
      totalSent: 0,
      delivered: 0,
      read: 0,
      replied: 0,
    },
    recentCampaigns: [],
    activeTriggers: [],
  };
}
