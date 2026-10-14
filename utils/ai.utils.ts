// ─── AI / Gemini Utility Helpers ─────────────────────────────────────────────
// Pure synchronous utilities for API key sanitization, model resolution, and defaults.

import type { OrganizationSettings } from "@/types/bill-scan";

export const RETIRED_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-exp",
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
  if (!trimmed) return "gemini-3.5-flash-lite";
  if (RETIRED_MODELS.includes(trimmed)) return "gemini-3.5-flash-lite";
  // Allow any valid gemini model identifier (ensures future-proof support for newer Google models)
  if (trimmed.startsWith("gemini-") || trimmed.startsWith("models/gemini-")) {
    return trimmed.replace(/^models\//, "");
  }
  return "gemini-3.5-flash-lite";
}

/**
 * Resiliently parses organization settings from PostgreSQL jsonb or double-stringified JSON strings.
 */
export function parseOrgSettings(rawSettings: any): OrganizationSettings {
  if (!rawSettings) return {};
  if (typeof rawSettings === "object" && rawSettings !== null) {
    const keys = Object.keys(rawSettings);
    if (keys.length > 5 && keys[0] === "0" && keys[1] === "1") {
      try {
        const strVal = Object.values(rawSettings).join("");
        const parsed = JSON.parse(strVal);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
      } catch {}
    }
    return rawSettings;
  }
  if (typeof rawSettings === "string") {
    try {
      const parsed = JSON.parse(rawSettings);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}
