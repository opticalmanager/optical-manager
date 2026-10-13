// ─── AI / Gemini Utility Helpers ─────────────────────────────────────────────
// Pure synchronous utilities for API key sanitization, model resolution, and defaults.

export const RETIRED_MODELS = [
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
