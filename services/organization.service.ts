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
    aiSettings.geminiApiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    null;

  const model = aiSettings.geminiModel?.trim() || "gemini-3.5-flash";

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
