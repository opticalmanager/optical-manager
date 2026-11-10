import { db } from "@/lib/drizzle";
import { 
  customers, 
  invoices, 
  prescriptions, 
  shops, 
  whatsappDispatchQueue,
  promotionCampaigns 
} from "@/db/schema";
import { eq, and, sql, isNull, gte, notInArray, desc } from "drizzle-orm";
import { getOrganizationAiConfig } from "@/services/organization.service";
import { resolveGeminiModel } from "@/utils/ai.utils";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  GrowthCohortCategory,
  SanitizedPatient,
  GrowthOpportunityCard,
  GrowthSummaryTelemetry,
  CampaignRefinementOptions,
  AiCampaignRefinementResult,
} from "@/types/ai-growth";

// ─── 1. E.164 Clean-Room Phone Sanitizer ───────────────────────────────────────
// Department of Telecommunications (DoT) allocated Indian mobile prefixes:
// 9x: 90-99, 8x: 81-89 (80 is Bangalore landline STD), 7x: 70, 72-79, 6x: 62-69
const INDIAN_MOBILE_10_REGEX = /^(?:[9]\d|[8][1-9]|[7][02-9]|[6][2-9])\d{8}$/;

export function sanitizeWhatsAppPhone(raw?: string | null): { 
  isValid: boolean; 
  formatted: string; 
  digits: string; 
} {
  if (!raw) return { isValid: false, formatted: "", digits: "" };
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  // 10-digit Indian Mobile
  if (digits.length === 10 && INDIAN_MOBILE_10_REGEX.test(digits)) {
    return {
      isValid: true,
      formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      digits: `91${digits}`,
    };
  }

  // 12-digit Indian Mobile (with 91 prefix)
  if (digits.length === 12 && digits.startsWith("91") && INDIAN_MOBILE_10_REGEX.test(digits.slice(2))) {
    const local = digits.slice(2);
    return {
      isValid: true,
      formatted: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
      digits: digits,
    };
  }

  // 11-digit Indian Mobile with leading 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0") && INDIAN_MOBILE_10_REGEX.test(digits.slice(1))) {
    const local = digits.slice(1);
    return {
      isValid: true,
      formatted: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
      digits: `91${local}`,
    };
  }

  // 13-digit Indian Mobile with 910... (e.g. +91 09876543210)
  if (digits.length === 13 && digits.startsWith("910") && INDIAN_MOBILE_10_REGEX.test(digits.slice(3))) {
    const local = digits.slice(3);
    return {
      isValid: true,
      formatted: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
      digits: `91${local}`,
    };
  }

  // 14-digit Indian Mobile with 0091... (e.g. 00919876543210)
  if (digits.length === 14 && digits.startsWith("0091") && INDIAN_MOBILE_10_REGEX.test(digits.slice(4))) {
    const local = digits.slice(4);
    return {
      isValid: true,
      formatted: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
      digits: `91${local}`,
    };
  }

  // International numbers with explicit country prefix '+' or '00'
  if (trimmed.startsWith("+") && !trimmed.startsWith("+91") && digits.length >= 10 && digits.length <= 15) {
    return {
      isValid: true,
      formatted: `+${digits}`,
      digits: digits,
    };
  }
  if (digits.startsWith("00") && !digits.startsWith("0091") && digits.length >= 12 && digits.length <= 16) {
    const nonZero = digits.slice(2);
    return {
      isValid: true,
      formatted: `+${nonZero}`,
      digits: nonZero,
    };
  }

  // Non-standard or landline (e.g. 011-XXXXXXXX, 080-XXXXXXXX, short codes)
  return {
    isValid: false,
    formatted: trimmed,
    digits: digits,
  };
}

// ─── 2. Pre-Tuned Clinical Optical Campaign Templates (Defensive Fallback) ───
export const CLINICAL_FALLBACK_TEMPLATES: Record<
  GrowthCohortCategory,
  {
    title: string;
    subtitle: string;
    badgeLabel: string;
    badgeColor: "blue" | "purple" | "emerald" | "amber" | "indigo" | "rose";
    rationale: string;
    clinicalAngle: string;
    defaultDiscount: string;
    messageBody: string;
    approvedOffer: string;
    aovEstimate: number;
  }
> = {
  ANNUAL_RX_EXPIRY: {
    title: "Annual Vision & Eye Test Due",
    subtitle: "Patients due for their 12-month optical review",
    badgeLabel: "Routine Recall",
    badgeColor: "blue",
    rationale: "Visual acuity shifts gradually every 10–14 months, while lens anti-reflective coatings suffer micro-crazing. Proactive recalls maintain patient eye health and boost repeat lens conversion.",
    clinicalAngle: "Routine 12-Month Optometric Review & Clarity Assessment",
    defaultDiscount: "15% OFF Frame Upgrade",
    approvedOffer: "Complimentary Vision Review + 15% off frame upgrade",
    messageBody: "Hi {{customer_name}}, it has been over a year since your last vision checkup with {{shop_name}}. Regular prescription reviews ensure strain-free vision and optimal focal comfort. Book your complimentary optical checkup this week and enjoy 15% off your next lens or frame upgrade. Reply YES to schedule your slot!",
    aovEstimate: 2800,
  },
  VIP_HIGH_SPENDER: {
    title: "VIP High-Spender Appreciation",
    subtitle: "Top-tier clientele with zero visits in 60+ days",
    badgeLabel: "High Value VIP",
    badgeColor: "purple",
    rationale: "Your top 15% spenders contribute over 50% of high-index and designer margin. Recognizing their loyalty with exclusive private preview vouchers locks in repeat high-margin sales.",
    clinicalAngle: "Private Eyewear Collection Preview & Priority Consultation",
    defaultDiscount: "₹500 VIP Voucher",
    approvedOffer: "Exclusive ₹500 VIP voucher on new designer arrivals",
    messageBody: "Dear {{customer_name}}, thank you for being a valued VIP patron at {{shop_name}}! We are delighted to gift you an exclusive ₹500 privileged store voucher valid towards our newest designer eyewear and premium anti-fatigue lenses. Visit us this weekend or reply to reserve your favorite frame styles.",
    aovEstimate: 6500,
  },
  UNUSED_STORE_CREDIT: {
    title: "Unclaimed Store Credit Reminder",
    subtitle: "Customers holding unredeemed credit balances",
    badgeLabel: "Unclaimed Credit",
    badgeColor: "emerald",
    rationale: "Customers often forget exchange balances. Notifying them brings immediate counter footfall, with over 78% of store credit redemptions resulting in an upsold basket higher than the credit value.",
    clinicalAngle: "Active Account Balance Redemption Notice",
    defaultDiscount: "Redeem Balance",
    approvedOffer: "100% Store Credit Redemption + Free Lens Cleaning Kit",
    messageBody: "Hi {{customer_name}}, friendly reminder from {{shop_name}}: You currently have an unused store balance of ₹{{store_credit}} in your account. You can apply this towards any new frames, sunglasses, or lens coatings before it lapses. Drop by our store anytime this week to redeem!",
    aovEstimate: 2200,
  },
  PROGRESSIVE_UPGRADE: {
    title: "Progressive & Blue-Cut Lens Upgrade",
    subtitle: "Multifocal wearers & presbyopic patients",
    badgeLabel: "Presbyope Tech",
    badgeColor: "indigo",
    rationale: "Screen-heavy lifestyles cause progressive wearers to experience focal neck fatigue after 18 months. Upgrading them to free-form digital progressives and blue-light filtration elevates optical quality.",
    clinicalAngle: "Focal Corridor Re-Alignment & Digital Eye Strain Relief",
    defaultDiscount: "20% OFF Digital Lenses",
    approvedOffer: "Free Corridor Fitting Review + 20% off digital progressive lenses",
    messageBody: "Hi {{customer_name}}, hope you are experiencing comfortable vision with your glasses from {{shop_name}}! If you spend long hours on screens or switch between reading and distance, drop in for a free focal re-alignment checkup and ask about our newest zero-distortion progressive & blue-cut lenses. Reply to learn more!",
    aovEstimate: 4500,
  },
  HIGH_CYLINDER_CHECKUP: {
    title: "High Astigmatism / Frame Fit Review",
    subtitle: "Cylinder prescriptions requiring lens alignment",
    badgeLabel: "Clinical Alignment",
    badgeColor: "rose",
    rationale: "Astigmatism requires precise optical axis alignment. When frames loosen or widen, the cylinder axis tilts, triggering headaches and blurred peripheral vision. A free tune-up creates exceptional clinical trust.",
    clinicalAngle: "5-Point Frame Fit & Astigmatic Optical Axis Verification",
    defaultDiscount: "Complimentary Tune-Up",
    approvedOffer: "Free 5-Point Frame Tuning & Axis Verification + Free Nose Pads",
    messageBody: "Dear {{customer_name}}, precision lens alignment is critical for your astigmatism prescription. Over time, frames loosen and induce visual strain. Visit {{shop_name}} this week for a complimentary 5-point frame tightening, screw adjustment, and alignment tune-up by our optical team!",
    aovEstimate: 3000,
  },
  DORMANT_LAPSED: {
    title: "Lapsed Patient Win-Back (180+ Days)",
    subtitle: "Past buyers inactive for over 6 months",
    badgeLabel: "Win-Back",
    badgeColor: "amber",
    rationale: "Optical customers typically wait until their frames break to seek new eyewear. An inviting seasonal win-back incentive reactivates them before they purchase from an online or mall competitor.",
    clinicalAngle: "Seasonal Vision & Frame Refresh Incentive",
    defaultDiscount: "₹350 Welcome-Back Voucher",
    approvedOffer: "₹350 Welcome-Back voucher towards any complete pair of glasses",
    messageBody: "Hi {{customer_name}}, we have missed seeing you at {{shop_name}}! We are offering our past patrons a special ₹350 welcome-back credit towards any complete pair of spectacles or designer sunglasses this month. Stop by or reply to check out the latest arrivals!",
    aovEstimate: 2500,
  },
};

// ─── 3. Single-Pass SQL Aggregation Service ────────────────────────────────────
export async function getGrowthOpportunitiesData(
  orgId: string,
  shopId?: string
): Promise<{
  telemetry: GrowthSummaryTelemetry;
  cards: GrowthOpportunityCard[];
  patientsByCohort: Record<GrowthCohortCategory, SanitizedPatient[]>;
}> {
  if (!orgId) {
    throw new Error("Organization ID is required for AI Growth Copilot");
  }

  // A. Fetch 14-Day Anti-Fatigue Shield Dispatch History
  // Messages queued/sent within the last 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentDispatches = await db
    .select({
      recipientPhone: whatsappDispatchQueue.recipientPhone,
      createdAt: whatsappDispatchQueue.createdAt,
    })
    .from(whatsappDispatchQueue)
    .where(
      and(
        eq(whatsappDispatchQueue.organizationId, orgId),
        gte(whatsappDispatchQueue.createdAt, fourteenDaysAgo),
        notInArray(whatsappDispatchQueue.status, ["FAILED", "CANCELLED", "HEARTBEAT", "COMMAND"])
      )
    )
    .orderBy(desc(whatsappDispatchQueue.createdAt));

  // Map normalized recipient phone -> last contacted Date
  // Stores both full digits and last 10 digits to prevent mismatch between +91 and 10-digit formats
  const cooldownPhoneMap = new Map<string, { lastContactedAt: Date; daysAgo: number }>();
  for (const item of recentDispatches) {
    if (!item.recipientPhone) continue;
    const clean = item.recipientPhone.replace(/\D/g, "");
    if (!clean) continue;
    
    const daysAgo = Math.max(0, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const record = {
      lastContactedAt: new Date(item.createdAt),
      daysAgo,
    };

    if (!cooldownPhoneMap.has(clean)) {
      cooldownPhoneMap.set(clean, record);
    }
    if (clean.length >= 10) {
      const suffix10 = clean.slice(-10);
      if (!cooldownPhoneMap.has(suffix10)) {
        cooldownPhoneMap.set(suffix10, record);
      }
    }
  }

  // B. Single-Pass SQL Aggregation via CTEs
  // Eliminates cartesian multiplication between invoices & prescriptions and accurately
  // resolves true lifetime spend and genuine latest prescription metrics.
  const rawCustomerMetrics = await db.execute<{
    id: string;
    fullName: string | null;
    phone: string | null;
    storeCredit: string | null;
    shopId: string | null;
    shopName: string | null;
    createdAt: string;
    lastInvoiceDate: string | null;
    lifetimeSpend: string;
    totalOrders: number;
    lastPrescriptionDate: string | null;
    lastLensType: string | null;
    lastRxCategory: string | null;
    lastRightCyl: string | null;
    lastLeftCyl: string | null;
    lastRightAdd: string | null;
    lastLeftAdd: string | null;
  }>(sql`
    WITH inv_summary AS (
      SELECT 
        customer_id,
        MAX(created_at) AS last_invoice_date,
        COALESCE(SUM(total::numeric), 0) AS lifetime_spend,
        COUNT(id)::int AS total_orders
      FROM invoices
      WHERE organization_id = ${orgId}::uuid
        AND deleted_at IS NULL
      GROUP BY customer_id
    ),
    rx_summary AS (
      SELECT DISTINCT ON (customer_id)
        customer_id,
        prescribed_at AS last_prescription_date,
        lens_type AS last_lens_type,
        rx_category AS last_rx_category,
        right_cylinder AS last_right_cyl,
        left_cylinder AS last_left_cyl,
        right_add AS last_right_add,
        left_add AS last_left_add
      FROM prescriptions
      WHERE organization_id = ${orgId}::uuid
      ORDER BY customer_id, prescribed_at DESC NULLS LAST, created_at DESC
    )
    SELECT 
      c.id,
      c.full_name AS "fullName",
      c.phone,
      c.store_credit AS "storeCredit",
      c.shop_id AS "shopId",
      s.name AS "shopName",
      c.created_at AS "createdAt",
      inv.last_invoice_date AS "lastInvoiceDate",
      COALESCE(inv.lifetime_spend, 0)::text AS "lifetimeSpend",
      COALESCE(inv.total_orders, 0)::int AS "totalOrders",
      rx.last_prescription_date AS "lastPrescriptionDate",
      rx.last_lens_type AS "lastLensType",
      rx.last_rx_category AS "lastRxCategory",
      rx.last_right_cyl AS "lastRightCyl",
      rx.last_left_cyl AS "lastLeftCyl",
      rx.last_right_add AS "lastRightAdd",
      rx.last_left_add AS "lastLeftAdd"
    FROM customers c
    LEFT JOIN shops s ON s.id = c.shop_id
    LEFT JOIN inv_summary inv ON inv.customer_id = c.id
    LEFT JOIN rx_summary rx ON rx.customer_id = c.id
    WHERE c.organization_id = ${orgId}::uuid
      ${shopId && shopId !== "ALL" ? sql`AND c.shop_id = ${shopId}::uuid` : sql``}
    ORDER BY c.created_at DESC;
  `);

  // C. In-Memory Sub-15ms Cohort Partitioning
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const patientsByCohort: Record<GrowthCohortCategory, SanitizedPatient[]> = {
    ANNUAL_RX_EXPIRY: [],
    VIP_HIGH_SPENDER: [],
    UNUSED_STORE_CREDIT: [],
    PROGRESSIVE_UPGRADE: [],
    HIGH_CYLINDER_CHECKUP: [],
    DORMANT_LAPSED: [],
  };

  const allSanitizedPatientsMap = new Map<string, SanitizedPatient>();

  for (const row of rawCustomerMetrics) {
    const rawPhone = row.phone || "";
    const phoneSanitized = sanitizeWhatsAppPhone(rawPhone);
    const creditNum = parseFloat(row.storeCredit || "0") || 0;
    const spendNum = parseFloat(row.lifetimeSpend || "0") || 0;
    const ordersNum = Number(row.totalOrders || 0);

    // Days calculations
    let daysSinceLastInvoice: number | null = null;
    if (row.lastInvoiceDate) {
      daysSinceLastInvoice = Math.floor((now - new Date(row.lastInvoiceDate).getTime()) / ONE_DAY_MS);
    } else if (row.createdAt) {
      daysSinceLastInvoice = Math.floor((now - new Date(row.createdAt).getTime()) / ONE_DAY_MS);
    }

    let daysSinceLastPrescription: number | null = null;
    if (row.lastPrescriptionDate) {
      daysSinceLastPrescription = Math.floor((now - new Date(row.lastPrescriptionDate).getTime()) / ONE_DAY_MS);
    }

    // Cooldown check (matches against full digits or last 10-digit mobile suffix)
    const cleanDigits = phoneSanitized.digits;
    const suffix10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : "";
    const cooldownInfo = cooldownPhoneMap.get(cleanDigits) || (suffix10 ? cooldownPhoneMap.get(suffix10) : undefined);
    
    const isRecentlyContacted = Boolean(cooldownInfo);
    const lastContactedDaysAgo = cooldownInfo?.daysAgo ?? null;

    const patient: SanitizedPatient = {
      id: row.id,
      fullName: row.fullName || "Valued Customer",
      phone: phoneSanitized.formatted || rawPhone,
      rawPhone: rawPhone,
      isValidWhatsApp: phoneSanitized.isValid,
      isRecentlyContacted,
      lastContactedDaysAgo,
      lastInvoiceDate: row.lastInvoiceDate,
      daysSinceLastVisit: daysSinceLastInvoice,
      lifetimeSpend: spendNum,
      totalOrders: ordersNum,
      storeCredit: creditNum,
      lastPrescriptionDate: row.lastPrescriptionDate,
      lastLensType: row.lastLensType,
      lastRxCategory: row.lastRxCategory,
      lastRightCyl: row.lastRightCyl,
      lastLeftCyl: row.lastLeftCyl,
      lastRightAdd: row.lastRightAdd,
      lastLeftAdd: row.lastLeftAdd,
      shopId: row.shopId,
      shopName: row.shopName || "Our Optical Store",
      cohortReasons: [],
    };

    // Cohort Rules Execution:
    // 1. ANNUAL_RX_EXPIRY (Recall window: 300 to 730 days / 10 to 24 months)
    const isAnnualDue = 
      (daysSinceLastPrescription !== null && daysSinceLastPrescription >= 300 && daysSinceLastPrescription <= 730) ||
      (daysSinceLastInvoice !== null && daysSinceLastInvoice >= 300 && daysSinceLastInvoice <= 730 && row.lastPrescriptionDate !== null);
    
    if (isAnnualDue) {
      patient.cohortReasons.push("ANNUAL_RX_EXPIRY");
      patientsByCohort.ANNUAL_RX_EXPIRY.push(patient);
    }

    // 2. VIP_HIGH_SPENDER (Spend >= ₹8,000 or >= 3 orders with no visits in 45+ days)
    const isVip = (spendNum >= 8000 || ordersNum >= 3) && (daysSinceLastInvoice === null || daysSinceLastInvoice >= 45);
    if (isVip) {
      patient.cohortReasons.push("VIP_HIGH_SPENDER");
      patientsByCohort.VIP_HIGH_SPENDER.push(patient);
    }

    // 3. UNUSED_STORE_CREDIT (Store credit >= ₹50 with no visits in 14+ days)
    const hasCredit = creditNum >= 50 && (daysSinceLastInvoice === null || daysSinceLastInvoice >= 14);
    if (hasCredit) {
      patient.cohortReasons.push("UNUSED_STORE_CREDIT");
      patientsByCohort.UNUSED_STORE_CREDIT.push(patient);
    }

    // 4. PROGRESSIVE_UPGRADE (Presbyopic patients with ADD power > 0 or existing progressive/bifocal lens)
    const lensStr = `${row.lastLensType || ""} ${row.lastRxCategory || ""}`.toLowerCase();
    const hasPresbyopiaRx = 
      (row.lastRightAdd !== null && parseFloat(row.lastRightAdd || "0") > 0) ||
      (row.lastLeftAdd !== null && parseFloat(row.lastLeftAdd || "0") > 0);
    const hasProgressiveHistory = /progressive|bifocal|pal|multifocal|add/i.test(lensStr);
    const isProgressiveCandidate = 
      hasProgressiveHistory ||
      hasPresbyopiaRx ||
      (daysSinceLastInvoice !== null && daysSinceLastInvoice >= 180 && spendNum >= 4500 && /reading|bifocal|progressive/i.test(lensStr));
    
    if (isProgressiveCandidate) {
      patient.cohortReasons.push("PROGRESSIVE_UPGRADE");
      patientsByCohort.PROGRESSIVE_UPGRADE.push(patient);
    }

    // 5. HIGH_CYLINDER_CHECKUP (Active patients with high astigmatism |CYL| >= 1.25 needing alignment)
    const rightCylNum = Math.abs(parseFloat(row.lastRightCyl || "0"));
    const leftCylNum = Math.abs(parseFloat(row.lastLeftCyl || "0"));
    const hasHighCylinder = (rightCylNum >= 1.25 || leftCylNum >= 1.25);
    const isRecentHighCylPatient = 
      hasHighCylinder && 
      ((daysSinceLastPrescription !== null && daysSinceLastPrescription <= 400) || 
       (daysSinceLastInvoice !== null && daysSinceLastInvoice <= 400));

    if (isRecentHighCylPatient) {
      patient.cohortReasons.push("HIGH_CYLINDER_CHECKUP");
      patientsByCohort.HIGH_CYLINDER_CHECKUP.push(patient);
    }

    // 6. DORMANT_LAPSED (Past buyers inactive for >= 180 days who are not active VIPs)
    const isDormant = (daysSinceLastInvoice !== null && daysSinceLastInvoice >= 180 && !isVip);
    if (isDormant) {
      patient.cohortReasons.push("DORMANT_LAPSED");
      patientsByCohort.DORMANT_LAPSED.push(patient);
    }

    allSanitizedPatientsMap.set(row.id, patient);
  }

  // D. Build 6 Opportunity Cards
  const cohortKeys: GrowthCohortCategory[] = [
    "ANNUAL_RX_EXPIRY",
    "VIP_HIGH_SPENDER",
    "UNUSED_STORE_CREDIT",
    "PROGRESSIVE_UPGRADE",
    "HIGH_CYLINDER_CHECKUP",
    "DORMANT_LAPSED",
  ];

  let totalRecoverablePipeline = 0;
  const uniqueReachablePatientIds = new Set<string>();
  const uniqueMatchedPatientIds = new Set<string>();
  let totalCooldownProtectedCount = 0;
  let totalInvalidPhoneCount = 0;

  const cards: GrowthOpportunityCard[] = cohortKeys.map((cohortKey) => {
    const list = patientsByCohort[cohortKey];
    const template = CLINICAL_FALLBACK_TEMPLATES[cohortKey];

    let reachableCount = 0;
    let invalidPhoneCount = 0;
    let cooldownCount = 0;

    for (const p of list) {
      uniqueMatchedPatientIds.add(p.id);
      if (!p.isValidWhatsApp) {
        invalidPhoneCount++;
      } else if (p.isRecentlyContacted) {
        cooldownCount++;
      } else {
        reachableCount++;
        uniqueReachablePatientIds.add(p.id);
      }
    }

    // Pipeline calculation
    const estimatedRev = cohortKey === "UNUSED_STORE_CREDIT"
      ? list.reduce((sum, p) => sum + p.storeCredit, 0) + (reachableCount * 1800)
      : reachableCount * template.aovEstimate;

    totalRecoverablePipeline += estimatedRev;
    totalCooldownProtectedCount += cooldownCount;
    totalInvalidPhoneCount += invalidPhoneCount;

    // First 4 sample preview patients
    const previewPatients = list.slice(0, 4).map((p) => ({
      id: p.id,
      fullName: p.fullName,
      phone: p.phone,
      spend: p.lifetimeSpend,
      isValidWhatsApp: p.isValidWhatsApp,
    }));

    return {
      cohortType: cohortKey,
      title: template.title,
      subtitle: template.subtitle,
      badgeLabel: template.badgeLabel,
      badgeColor: template.badgeColor,
      rationale: template.rationale,
      clinicalAngle: template.clinicalAngle,
      estimatedRevenue: Math.round(estimatedRev),
      patientCount: list.length,
      reachableCount,
      invalidPhoneCount,
      cooldownCount,
      defaultDiscount: template.defaultDiscount,
      suggestedMessage: template.messageBody,
      previewPatients,
    };
  });

  // E. Telemetry Structure
  const telemetry: GrowthSummaryTelemetry = {
    totalRecoverablePipeline: Math.round(totalRecoverablePipeline),
    totalReachablePatients: uniqueReachablePatientIds.size,
    totalMatchedPatients: uniqueMatchedPatientIds.size,
    cooldownProtectedCount: totalCooldownProtectedCount,
    invalidPhoneCount: totalInvalidPhoneCount,
    whatsappStatus: "OFFLINE", // populated by server action with live desktop check
    activeShopId: shopId || "ALL",
  };

  return {
    telemetry,
    cards,
    patientsByCohort,
  };
}

// ─── 4. Gemini 3.5 Flash Refinement with Optometric Guardrails ──────────────────
export async function generateAiCampaignCopy(
  orgId: string,
  options: CampaignRefinementOptions
): Promise<AiCampaignRefinementResult> {
  const fallback = CLINICAL_FALLBACK_TEMPLATES[options.cohortType] || CLINICAL_FALLBACK_TEMPLATES.ANNUAL_RX_EXPIRY;

  try {
    const aiConfig = await getOrganizationAiConfig(orgId);
    if (!aiConfig.apiKey) {
      return {
        campaignTitle: fallback.title,
        targetAngle: fallback.clinicalAngle,
        messageBody: fallback.messageBody,
        approvedOffer: options.discountCap || fallback.approvedOffer,
        expiryDays: 7,
      };
    }

    const genAI = new GoogleGenerativeAI(aiConfig.apiKey);
    const modelName = resolveGeminiModel(aiConfig.model || "gemini-3.5-flash-lite");
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3, // Lower temperature to avoid hallucination
        maxOutputTokens: 1024,
      },
    });

    const prompt = `You are a licensed clinical optometrist and growth strategist for an optical retail store.
Create a high-converting, clinically ethical WhatsApp promotional message.

COHORT: ${options.cohortType}
BASE RATIONALE: ${fallback.rationale}
TONE REQUIREMENT: ${options.tone || "clinical & caring"}
OCCASION / THEME: ${options.occasion || "Regular Optical Review"}
OFFER / DISCOUNT CAP: ${options.discountCap || fallback.defaultDiscount}
OWNER CUSTOM NOTES: ${options.customNotes || "None"}

STRICT CLINICAL ETHICAL RULES:
1. NEVER claim lenses or frames "cure", "heal", or "eliminate" eye diseases, refractive errors, or migraines.
2. Permitted terms: "digital eye strain relief", "routine vision review", "optimal focal clarity", "precise lens alignment", "frame tune-up".
3. Must include dynamic placeholders: {{customer_name}}, {{shop_name}}, and optionally {{store_credit}}.
4. Keep the message concise (under 75 words) and formatted for WhatsApp with clear spacing and a friendly call to action (e.g. "Reply YES to reserve").
5. Do NOT promise discounts beyond: ${options.discountCap || fallback.defaultDiscount}.

Return strictly JSON with this exact schema:
{
  "campaignTitle": "Short punchy internal title (max 6 words)",
  "targetAngle": "Clinical or marketing angle (max 8 words)",
  "messageBody": "The exact WhatsApp message text with {{customer_name}} and {{shop_name}}",
  "approvedOffer": "Exact approved offer text",
  "expiryDays": 7
}`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timeout")), 12000)
    );

    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ]);

    const text = result.response.text();
    if (!text) throw new Error("Empty AI response");

    const parsed = JSON.parse(text);
    return {
      campaignTitle: parsed.campaignTitle || fallback.title,
      targetAngle: parsed.targetAngle || fallback.clinicalAngle,
      messageBody: parsed.messageBody || fallback.messageBody,
      approvedOffer: parsed.approvedOffer || options.discountCap || fallback.approvedOffer,
      expiryDays: Number(parsed.expiryDays) || 7,
    };
  } catch (error) {
    console.warn("generateAiCampaignCopy using fallback:", error);
    return {
      campaignTitle: fallback.title,
      targetAngle: fallback.clinicalAngle,
      messageBody: fallback.messageBody,
      approvedOffer: options.discountCap || fallback.approvedOffer,
      expiryDays: 7,
    };
  }
}
