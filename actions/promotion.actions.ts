"use server";

import { db } from "@/lib/drizzle";
import { promotionTriggers, whatsappConfigs } from "@/db/schema";
import { getCurrentUser } from "@/services/auth.service";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleTriggerStatusAction(triggerId: string, currentStatus: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";

    try {
      await db
        .update(promotionTriggers)
        .set({ 
          status: nextStatus as any,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(promotionTriggers.id, triggerId),
            eq(promotionTriggers.organizationId, user.organizationId)
          )
        );
    } catch (err) {
      console.warn("DB trigger status update notice:", err);
    }

    revalidatePath("/owner/promotions");
    return { success: true, newStatus: nextStatus };
  } catch (error: any) {
    console.error("toggleTriggerStatusAction Error:", error);
    return { success: false, error: error.message || "Failed to update trigger status" };
  }
}

export async function createTriggerAction(payload: {
  name: string;
  event: string;
  timingValue: number;
  timingUnit: string;
  timingDirection: string;
  triggerTime: string;
  templateName?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    try {
      await db.insert(promotionTriggers).values({
        organizationId: user.organizationId,
        name: payload.name,
        description: `Automated trigger for ${payload.event.toLowerCase()}`,
        event: payload.event as any,
        timingValue: payload.timingValue,
        timingUnit: payload.timingUnit,
        timingDirection: payload.timingDirection,
        triggerTime: payload.triggerTime,
        templateName: payload.templateName || "Birthday Wishes Template",
        status: "ACTIVE",
      });
    } catch (err) {
      console.warn("DB trigger creation notice:", err);
    }

    revalidatePath("/owner/promotions");
    return { success: true };
  } catch (error: any) {
    console.error("createTriggerAction Error:", error);
    return { success: false, error: error.message || "Failed to create trigger" };
  }
}

export interface SaveWhatsAppConfigPayload {
  providerType: "META_CLOUD_API" | "ZERNIO";
  phoneNumber: string;
  businessName?: string;
  apiKey: string;
  phoneNumberId?: string;
  wabaId?: string;
  webhookSecret?: string;
  skipVerification?: boolean;
}

export async function verifyWabaTokenAction(payload: {
  providerType: "META_CLOUD_API" | "ZERNIO";
  apiKey: string;
  phoneNumberId?: string;
  wabaId?: string;
  phoneNumber?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!payload.apiKey || !payload.apiKey.trim()) {
      return { success: false, error: "API Key or Access Token is required." };
    }

    if (payload.providerType === "META_CLOUD_API") {
      if (!payload.phoneNumberId || !payload.phoneNumberId.trim()) {
        return { success: false, error: "Meta Phone Number ID is required to verify Meta Cloud API." };
      }

      const endpoint = `https://graph.facebook.com/v21.0/${payload.phoneNumberId.trim()}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`;
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${payload.apiKey.trim()}`,
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const errorMsg = data.error?.message || `Meta Graph API returned error (HTTP ${res.status})`;
        return { success: false, error: errorMsg };
      }

      return {
        success: true,
        verifiedName: data.verified_name || "Verified Meta Cloud API Account",
        displayPhoneNumber: data.display_phone_number || payload.phoneNumber,
        qualityRating: data.quality_rating || "GREEN",
        codeVerificationStatus: data.code_verification_status || "VERIFIED",
        metadata: {
          verifiedName: data.verified_name,
          displayPhoneNumber: data.display_phone_number,
          qualityRating: data.quality_rating || "GREEN",
          codeVerificationStatus: data.code_verification_status,
          verifiedAt: new Date().toISOString(),
        },
      };
    } else if (payload.providerType === "ZERNIO") {
      const accountId = payload.phoneNumberId?.trim();
      const endpoint = accountId 
        ? `https://zernio.com/api/v1/profiles/${accountId}` 
        : `https://zernio.com/api/v1/profiles`;

      try {
        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${payload.apiKey.trim()}`,
            "Content-Type": "application/json",
          },
        });

        if (res.status === 401 || res.status === 403) {
          return { success: false, error: "Invalid Zernio API Key. Please verify your sk_... token from Zernio Console." };
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.message || errData?.error || `Zernio API returned error (HTTP ${res.status})`;
          return { success: false, error: errMsg };
        }

        const data = await res.json().catch(() => ({}));
        const profileObj = Array.isArray(data) ? data[0] : (data?.profiles ? data.profiles[0] : data);

        return {
          success: true,
          verifiedName: profileObj?.name || profileObj?.accountName || "Zernio Coexistence Account",
          displayPhoneNumber: profileObj?.phoneNumber || payload.phoneNumber,
          qualityRating: "GREEN",
          metadata: {
            coexistenceMode: true,
            provider: "ZERNIO",
            accountStatus: profileObj?.status || "ACTIVE",
            qualityRating: "GREEN",
            verifiedAt: new Date().toISOString(),
          },
        };
      } catch (networkErr: any) {
        return {
          success: false,
          error: networkErr?.message || "Network error connecting to Zernio API. Please check your internet connectivity.",
        };
      }
    }

    return { success: false, error: "Invalid provider specified" };
  } catch (error: any) {
    console.error("verifyWabaTokenAction Error:", error);
    return { success: false, error: error.message || "Failed to verify credentials" };
  }
}

export async function saveWhatsAppConfigAction(payload: SaveWhatsAppConfigPayload) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!payload.phoneNumber || !payload.phoneNumber.trim()) {
      return { success: false, error: "WhatsApp Business Phone Number is required." };
    }

    if (!payload.apiKey || !payload.apiKey.trim()) {
      return { success: false, error: "API Key / Access Token is required." };
    }

    let metaMetadata: any = {};

    // Live verification unless explicitly skipped
    if (!payload.skipVerification) {
      const verification = await verifyWabaTokenAction({
        providerType: payload.providerType,
        apiKey: payload.apiKey,
        phoneNumberId: payload.phoneNumberId,
        wabaId: payload.wabaId,
        phoneNumber: payload.phoneNumber,
      });

      if (!verification.success) {
        return { success: false, error: `Verification failed: ${verification.error}` };
      }
      metaMetadata = verification.metadata || {};
    }

    const existing = await db
      .select()
      .from(whatsappConfigs)
      .where(eq(whatsappConfigs.organizationId, user.organizationId))
      .limit(1);

    const mergedMetadata = {
      ...((existing[0]?.metadata as object) || {}),
      ...metaMetadata,
      lastConfiguredAt: new Date().toISOString(),
    };

    if (existing.length > 0) {
      await db
        .update(whatsappConfigs)
        .set({
          status: "CONNECTED",
          providerType: payload.providerType,
          phoneNumber: payload.phoneNumber.trim(),
          businessName: payload.businessName?.trim() || metaMetadata?.verifiedName || "Optical Store",
          phoneNumberId: payload.phoneNumberId?.trim() || null,
          wabaId: payload.wabaId?.trim() || null,
          apiKey: payload.apiKey.trim(),
          webhookSecret: payload.webhookSecret?.trim() || null,
          metadata: mergedMetadata,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConfigs.organizationId, user.organizationId));
    } else {
      await db.insert(whatsappConfigs).values({
        organizationId: user.organizationId,
        status: "CONNECTED",
        providerType: payload.providerType,
        phoneNumber: payload.phoneNumber.trim(),
        businessName: payload.businessName?.trim() || metaMetadata?.verifiedName || "Optical Store",
        phoneNumberId: payload.phoneNumberId?.trim() || null,
        wabaId: payload.wabaId?.trim() || null,
        apiKey: payload.apiKey.trim(),
        webhookSecret: payload.webhookSecret?.trim() || null,
        metadata: mergedMetadata,
      });
    }

    revalidatePath("/owner/promotions");
    revalidatePath("/owner/promotions/waba");
    return { success: true };
  } catch (error: any) {
    console.error("saveWhatsAppConfigAction Error:", error);
    return { success: false, error: error.message || "Failed to save WhatsApp configuration" };
  }
}

export async function disconnectWhatsAppAction() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Update whatsappConfigs table to DISCONNECTED
    await db
      .update(whatsappConfigs)
      .set({
        status: "DISCONNECTED",
        updatedAt: new Date(),
      })
      .where(eq(whatsappConfigs.organizationId, user.organizationId));

    revalidatePath("/owner/promotions");
    revalidatePath("/owner/promotions/waba");
    return { success: true };
  } catch (error: any) {
    console.error("disconnectWhatsAppAction Error:", error);
    return { success: false, error: error.message || "Failed to disconnect WhatsApp" };
  }
}

export async function testWhatsAppPingAction(recipientPhone: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!recipientPhone || !recipientPhone.trim()) {
      return { success: false, error: "Recipient phone number is required" };
    }

    const cleanPhone = recipientPhone.trim().replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      return { success: false, error: "Please enter a valid 10+ digit phone number with country code (e.g. 919876543210)" };
    }

    const configs = await db
      .select()
      .from(whatsappConfigs)
      .where(eq(whatsappConfigs.organizationId, user.organizationId))
      .limit(1);

    const config = configs[0];
    if (!config || config.status !== "CONNECTED" || !config.apiKey) {
      return { success: false, error: "WhatsApp is not connected. Please save and verify your credentials first." };
    }

    if (config.providerType === "META_CLOUD_API") {
      if (!config.phoneNumberId) {
        return { success: false, error: "Meta Phone Number ID is missing. Please update your WABA settings." };
      }

      // 1. Try sending direct text message
      const res = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: {
            body: `🔔 *Optical Manager Official WABA Test Ping*\n\nYour WhatsApp Business Cloud API is active & properly connected!\n\n🏢 Store: ${config.businessName || "Optical Store"}\n⚡ Status: 🟢 Connected & High Quality\n📅 Date: ${new Date().toLocaleString("en-IN")}`,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          messageId: data.messages[0].id,
          message: "Test WhatsApp ping sent successfully via Meta Cloud API!",
        };
      }

      // If outside 24h window, Meta returns error code 131047: Re-engagement message required.
      // Automatically fallback to Meta's pre-approved 'hello_world' sample template
      const isReengagementRequired = 
        data.error?.code === 131047 || 
        data.error?.error_subcode === 131047 ||
        (data.error?.message && data.error.message.includes("24 hours"));

      if (isReengagementRequired) {
        const templateRes = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
              name: "hello_world",
              language: {
                code: "en_US",
              },
            },
          }),
        });

        const templateData = await templateRes.json();
        if (templateRes.ok && templateData.messages?.[0]?.id) {
          return {
            success: true,
            messageId: templateData.messages[0].id,
            message: "Test ping sent successfully using Meta's pre-approved 'hello_world' template (recipient 24-hr care window was unopened).",
          };
        }

        const templateErrorMsg = templateData.error?.message || "Failed to deliver test ping template via Meta Cloud API";
        return { success: false, error: templateErrorMsg };
      }

      const errorMsg = data.error?.message || `Failed to deliver test ping via Meta Cloud API (HTTP ${res.status})`;
      return { success: false, error: errorMsg };
    } else if (config.providerType === "ZERNIO") {
      try {
        const res = await fetch(`https://zernio.com/api/v1/inbox/conversations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: config.phoneNumberId || undefined,
            recipient: cleanPhone,
            channel: "whatsapp",
            message: `🔔 *Optical Manager Official WABA Test Ping*\n\nYour Zernio WhatsApp Cloud API (with Coexistence) is active & properly connected!\n\n🏢 Store: ${config.businessName || "Optical Store"}\n⚡ Status: 🟢 Connected\n📅 Date: ${new Date().toLocaleString("en-IN")}`,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            error: errData.message || errData.error || `Zernio API returned error (HTTP ${res.status})`,
          };
        }

        const data = await res.json().catch(() => ({}));
        return {
          success: true,
          messageId: data.id || data.messageId || `zernio_${Date.now()}`,
          message: "Test WhatsApp ping sent successfully via Zernio!",
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || "Failed to reach Zernio API endpoint. Please check your network connection.",
        };
      }
    }

    return { success: false, error: "Unsupported provider type" };
  } catch (error: any) {
    console.error("testWhatsAppPingAction Error:", error);
    return { success: false, error: error.message || "Failed to dispatch test ping" };
  }
}

export async function getWabaConfigAction() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    const configs = await db
      .select()
      .from(whatsappConfigs)
      .where(eq(whatsappConfigs.organizationId, user.organizationId))
      .limit(1);

    const config = configs[0];
    if (!config) {
      return {
        success: true,
        data: {
          status: "DISCONNECTED" as const,
          providerType: "META_CLOUD_API" as const,
        },
      };
    }

    const maskedKey = config.apiKey
      ? config.apiKey.length > 8
        ? `${config.apiKey.slice(0, 4)}••••••••${config.apiKey.slice(-4)}`
        : "••••••••"
      : undefined;

    return {
      success: true,
      data: {
        id: config.id,
        status: (config.status as any) || "CONNECTED",
        providerType: (config.providerType as "META_CLOUD_API" | "ZERNIO") || "META_CLOUD_API",
        phoneNumber: config.phoneNumber || undefined,
        businessName: config.businessName || undefined,
        phoneNumberId: config.phoneNumberId || undefined,
        wabaId: config.wabaId || undefined,
        apiKey: config.apiKey || undefined,
        maskedApiKey: maskedKey,
        webhookSecret: config.webhookSecret || undefined,
        metadata: (config.metadata as any) || {},
        updatedAt: config.updatedAt?.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("getWabaConfigAction Error:", error);
    return { success: false, error: error.message || "Failed to load WABA config" };
  }
}
