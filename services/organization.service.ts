"use server";

import { db } from "@/lib/drizzle";
import { organizations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Organization, NewOrganization } from "@/types";
import type { OrganizationSettings, OrganizationAISettings } from "@/types/bill-scan";

let isSettingsColumnEnsured = false;

/**
 * Ensures the settings column exists on the organizations table.
 */
export async function ensureOrganizationSettingsColumn(): Promise<void> {
  if (isSettingsColumnEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb;`
    );
    isSettingsColumnEnsured = true;
  } catch (error) {
    isSettingsColumnEnsured = true;
  }
}

/**
 * Get an organization by ID.
 */
export async function getOrganizationById(
  id: string
): Promise<Organization | null> {
  await ensureOrganizationSettingsColumn();
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  return org ?? null;
}

/**
 * Update an organization.
 */
export async function updateOrganization(
  id: string,
  data: Partial<NewOrganization>
): Promise<Organization> {
  await ensureOrganizationSettingsColumn();
  const [org] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();

  return org;
}

const RETIRED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

export function sanitizeGeminiApiKey(key?: string | null): string | null {
  if (!key) return null;
  let clean = key.trim();
  clean = clean.replace(/^bearer\s+/i, "");
  clean = clean.replace(/^GEMINI_API_KEY\s*=\s*/i, "");
  clean = clean.replace(/^['"]|['"]$/g, "");
  clean = clean.trim();
  return clean || null;
}

export function resolveGeminiModel(rawModel?: string | null): string {
  const trimmed = rawModel?.trim();
  if (!trimmed) return "gemini-3.6-flash";
  if (RETIRED_MODELS.includes(trimmed)) return "gemini-3.6-flash";
  // Allow any valid gemini model identifier (ensures future-proof support for newer Google models)
  if (trimmed.startsWith("gemini-") || trimmed.startsWith("models/gemini-")) {
    return trimmed.replace(/^models\//, "");
  }
  return "gemini-3.6-flash";
}

/**
 * Get the AI configuration for an organization.
 * Falls back to process.env.GEMINI_API_KEY if not configured in DB.
 */
export async function getOrganizationAiConfig(
  organizationId: string
): Promise<{
  apiKey: string | null;
  model: string;
  isConfigured: boolean;
}> {
  const org = await getOrganizationById(organizationId);
  const settings = (org?.settings as OrganizationSettings) || {};
  const aiSettings = settings.ai || {};

  const apiKey =
    sanitizeGeminiApiKey(aiSettings.geminiApiKey) ||
    sanitizeGeminiApiKey(process.env.GEMINI_API_KEY) ||
    null;

  const model = resolveGeminiModel(aiSettings.geminiModel);

  return {
    apiKey,
    model,
    isConfigured: !!apiKey,
  };
}

/**
 * Update the AI settings for an organization.
 */
export async function updateOrganizationAiSettings(
  organizationId: string,
  aiSettingsUpdate: Partial<OrganizationAISettings>
): Promise<Organization> {
  await ensureOrganizationSettingsColumn();
  const currentOrg = await getOrganizationById(organizationId);
  const currentSettings = (currentOrg?.settings as OrganizationSettings) || {};

  const updatedSettings: OrganizationSettings = {
    ...currentSettings,
    ai: {
      ...(currentSettings.ai || {}),
      ...aiSettingsUpdate,
      geminiApiKey:
        aiSettingsUpdate.geminiApiKey !== undefined
          ? sanitizeGeminiApiKey(aiSettingsUpdate.geminiApiKey) || undefined
          : currentSettings.ai?.geminiApiKey,
      geminiModel:
        aiSettingsUpdate.geminiModel !== undefined
          ? resolveGeminiModel(aiSettingsUpdate.geminiModel)
          : currentSettings.ai?.geminiModel,
    },
  };

  const [updated] = await db
    .update(organizations)
    .set({
      settings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  return updated;
}
