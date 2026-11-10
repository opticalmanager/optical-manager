export type GrowthCohortCategory =
  | "ANNUAL_RX_EXPIRY"
  | "VIP_HIGH_SPENDER"
  | "UNUSED_STORE_CREDIT"
  | "PROGRESSIVE_UPGRADE"
  | "HIGH_CYLINDER_CHECKUP"
  | "DORMANT_LAPSED";

export interface SanitizedPatient {
  id: string;
  fullName: string;
  phone: string;
  rawPhone: string;
  isValidWhatsApp: boolean;
  isRecentlyContacted: boolean;
  lastContactedDaysAgo?: number | null;
  lastInvoiceDate?: string | null;
  daysSinceLastVisit?: number | null;
  lifetimeSpend: number;
  totalOrders: number;
  storeCredit: number;
  lastPrescriptionDate?: string | null;
  lastLensType?: string | null;
  lastRxCategory?: string | null;
  lastRightCyl?: string | null;
  lastLeftCyl?: string | null;
  lastRightAdd?: string | null;
  lastLeftAdd?: string | null;
  shopId?: string | null;
  shopName?: string | null;
  cohortReasons: GrowthCohortCategory[];
}

export interface GrowthOpportunityCard {
  cohortType: GrowthCohortCategory;
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeColor: "blue" | "purple" | "emerald" | "amber" | "indigo" | "rose";
  rationale: string;
  clinicalAngle: string;
  estimatedRevenue: number;
  patientCount: number;
  reachableCount: number;
  invalidPhoneCount: number;
  cooldownCount: number;
  defaultDiscount: string;
  suggestedMessage: string;
  previewPatients: Array<{
    id: string;
    fullName: string;
    phone: string;
    spend: number;
    isValidWhatsApp: boolean;
  }>;
}

export interface GrowthSummaryTelemetry {
  totalRecoverablePipeline: number;
  totalReachablePatients: number;
  totalMatchedPatients: number;
  cooldownProtectedCount: number;
  invalidPhoneCount: number;
  whatsappStatus: "CONNECTED_READY" | "APP_ONLINE_WA_DISCONNECTED" | "OFFLINE";
  connectedPhone?: string | null;
  activeShopId?: string;
}

export interface CampaignRefinementOptions {
  cohortType: GrowthCohortCategory;
  tone?: "clinical" | "friendly" | "urgent" | "festive";
  occasion?: string;
  discountCap?: string;
  customNotes?: string;
}

export interface AiCampaignRefinementResult {
  campaignTitle: string;
  targetAngle: string;
  messageBody: string;
  approvedOffer: string;
  expiryDays: number;
}

export interface DispatchGrowthBroadcastPayload {
  cohortType: GrowthCohortCategory;
  patientIds: string[];
  messageTemplate: string;
  shopId?: string;
  offerDetails?: string;
  campaignName?: string;
  enforceAntiFatigue?: boolean;
}

export interface DispatchGrowthBroadcastResult {
  success: boolean;
  campaignId?: string;
  enqueuedCount: number;
  skippedCount: number;
  cooldownSkippedCount: number;
  invalidPhoneSkippedCount: number;
  isDesktopOnline: boolean;
  estimatedDeliveryTimeSeconds: number;
  error?: string;
}
