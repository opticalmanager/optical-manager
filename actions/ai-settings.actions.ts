"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import {
  getOrganizationAiConfig,
  updateOrganizationAiSettings,
} from "@/services/organization.service";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Server Action: Test a Gemini API key and model connectivity.
 */
export async function testGeminiApiKeyAction(
  apiKey: string,
  modelName: string = "gemini-3.5-flash"
): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: "Please enter a valid Gemini API Key." };
  }

  const cleanKey = apiKey.trim();
  const startTime = Date.now();

  try {
    const genAI = new GoogleGenerativeAI(cleanKey);
    const candidateModels = [
      modelName,
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

    let lastError: any = null;
    for (const name of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent("Reply with pong");
        const responseText = result.response.text();
        const latencyMs = Date.now() - startTime;
        if (responseText) {
          return {
            success: true,
            message: `Connected successfully with ${name} (${latencyMs}ms response time).`,
            latencyMs,
          };
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
          throw err;
        }
      }
    }

    if (lastError) throw lastError;

    return {
      success: false,
      message: "No response received from the Gemini model.",
    };
  } catch (error: any) {
    console.error("Gemini connection test failed:", error);
    const msg = error?.message || "Failed to connect to Gemini API.";

    if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
      return {
        success: false,
        message: "Invalid API key. Please check your credentials from Google AI Studio.",
      };
    }

    if (msg.includes("denied access") || msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
      return {
        success: false,
        message: `Your Google AI project has been denied access (403 Forbidden). Please create an API key in an active Google AI Studio project.`,
      };
    }

    if (msg.includes("not found") || msg.includes("404") || msg.includes("NOT_FOUND")) {
      return {
        success: false,
        message: `Model is unavailable on this API key. Please generate a new key from Google AI Studio.`,
      };
    }

    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
      return {
        success: false,
        message: "API rate limit or quota exceeded. Please wait a few seconds and try again.",
      };
    }

    return {
      success: false,
      message: `Connection test failed: ${msg}`,
    };
  }
}

/**
 * Server Action: Check AI configuration status for current organization.
 */
export async function getOrganizationAiStatusAction(): Promise<{
  isConfigured: boolean;
  model: string;
  maskedKey?: string;
}> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { isConfigured: false, model: "gemini-2.5-flash" };
  }

  const config = await getOrganizationAiConfig(user.organizationId);
  let maskedKey: string | undefined = undefined;

  if (config.apiKey) {
    const k = config.apiKey;
    maskedKey =
      k.length > 8
        ? `${k.slice(0, 4)}...${k.slice(-4)}`
        : "••••••••";
  }

  return {
    isConfigured: config.isConfigured,
    model: config.model,
    maskedKey,
  };
}

/**
 * Server Action: Update Organization AI Settings.
 */
export async function updateOrganizationAiSettingsAction(data: {
  geminiApiKey?: string;
  geminiModel?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, message: "Unauthorized: No active organization session." };
  }

  try {
    await updateOrganizationAiSettings(user.organizationId, {
      geminiApiKey: data.geminiApiKey?.trim() || undefined,
      geminiModel: data.geminiModel?.trim() || "gemini-2.5-flash",
    });

    revalidatePath("/owner/settings");
    revalidatePath("/shop/purchases/new");

    return {
      success: true,
      message: "AI settings saved successfully!",
    };
  } catch (error: any) {
    console.error("Failed to update AI settings:", error);
    return {
      success: false,
      message: error?.message || "Failed to save AI settings.",
    };
  }
}
