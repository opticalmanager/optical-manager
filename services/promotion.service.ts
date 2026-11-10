"use server";

import { db } from "@/lib/drizzle";
import { 
  whatsappConfigs, 
  whatsappTemplates, 
  promotionTriggers, 
  promotionCampaigns,
} from "@/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";

export interface PromotionTelemetry {
  totalSent: number;
  delivered: number;
  read: number;
  replied: number;
}

export interface WabaConfigData {
  id?: string;
  status: "CONNECTED" | "DISCONNECTED" | "PENDING";
  providerType: "META_CLOUD_API" | "ZERNIO";
  phoneNumber?: string;
  businessName?: string;
  phoneNumberId?: string;
  wabaId?: string;
  maskedApiKey?: string;
  apiKey?: string;
  webhookSecret?: string;
  metadata?: {
    qualityRating?: string;
    verifiedName?: string;
    coexistenceMode?: boolean;
    verifiedAt?: string;
    [key: string]: any;
  };
  updatedAt?: string;
}

export interface PromotionOverviewData {
  whatsappStatus: "CONNECTED" | "DISCONNECTED" | "PENDING";
  providerType?: "META_CLOUD_API" | "ZERNIO";
  phoneNumber?: string;
  businessName?: string;
  phoneNumberId?: string;
  wabaId?: string;
  qualityRating?: string;
  activeTemplatesCount: number;
  activeTriggersCount: number;
  upcomingCampaignsCount: number;
  telemetry: PromotionTelemetry;
  wabaConfig?: WabaConfigData;
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

export async function getWabaConfig(orgId: string): Promise<WabaConfigData | null> {
  try {
    if (!orgId) return null;
    const configRows = await db
      .select()
      .from(whatsappConfigs)
      .where(eq(whatsappConfigs.organizationId, orgId))
      .limit(1)
      .catch(() => []);

    const config = configRows[0];
    if (!config) return null;

    const maskedKey = config.apiKey
      ? config.apiKey.length > 8
        ? `${config.apiKey.slice(0, 4)}••••••••${config.apiKey.slice(-4)}`
        : "••••••••"
      : undefined;

    return {
      id: config.id,
      status: (config.status as any) || "CONNECTED",
      providerType: (config.providerType as "META_CLOUD_API" | "ZERNIO") || "META_CLOUD_API",
      phoneNumber: config.phoneNumber || undefined,
      businessName: config.businessName || undefined,
      phoneNumberId: config.phoneNumberId || undefined,
      wabaId: config.wabaId || undefined,
      maskedApiKey: maskedKey,
      apiKey: config.apiKey || undefined,
      webhookSecret: config.webhookSecret || undefined,
      metadata: (config.metadata as any) || {},
      updatedAt: config.updatedAt?.toISOString(),
    };
  } catch (error) {
    console.error("[getWabaConfig] Error:", error);
    return null;
  }
}

export async function getPromotionDashboardData(orgId: string): Promise<PromotionOverviewData> {
  try {
    if (!orgId) {
      return getFallbackData("DISCONNECTED");
    }

    // 1. Fetch Stored Official WABA Config from DB
    const configRows = await db
      .select()
      .from(whatsappConfigs)
      .where(eq(whatsappConfigs.organizationId, orgId))
      .limit(1)
      .catch(() => []);

    const config = configRows[0];
    const isConnected = config?.status === "CONNECTED";
    const whatsappStatus: "CONNECTED" | "DISCONNECTED" | "PENDING" = isConnected ? "CONNECTED" : "DISCONNECTED";
    const providerType: "META_CLOUD_API" | "ZERNIO" = (config?.providerType as "META_CLOUD_API" | "ZERNIO") || "META_CLOUD_API";
    const metaObj: any = (config?.metadata as any) || {};
    const qualityRating: string = metaObj?.qualityRating || (isConnected ? "GREEN" : "UNKNOWN");

    const maskedKey = config?.apiKey
      ? config.apiKey.length > 8
        ? `${config.apiKey.slice(0, 4)}••••••••${config.apiKey.slice(-4)}`
        : "••••••••"
      : undefined;

    const wabaConfig: WabaConfigData | undefined = config
      ? {
          id: config.id,
          status: whatsappStatus,
          providerType,
          phoneNumber: config.phoneNumber || undefined,
          businessName: config.businessName || undefined,
          phoneNumberId: config.phoneNumberId || undefined,
          wabaId: config.wabaId || undefined,
          maskedApiKey: maskedKey,
          webhookSecret: config.webhookSecret || undefined,
          metadata: metaObj,
          updatedAt: config.updatedAt?.toISOString(),
        }
      : undefined;

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
      phoneNumber: config?.phoneNumber || undefined,
      businessName: config?.businessName || undefined,
      phoneNumberId: config?.phoneNumberId || undefined,
      wabaId: config?.wabaId || undefined,
      qualityRating,
      wabaConfig,
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
