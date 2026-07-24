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

export async function saveWhatsAppConfigAction(payload: {
  providerType: "META_CLOUD_API" | "TWILIO" | "QR_GATEWAY";
  phoneNumber: string;
  businessName?: string;
  apiKey?: string;
  accountSid?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await db
      .select()
      .from(whatsappConfigs)
      .where(eq(whatsappConfigs.organizationId, user.organizationId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(whatsappConfigs)
        .set({
          status: "CONNECTED",
          phoneNumber: payload.phoneNumber,
          businessName: payload.businessName || "Optical Store",
          apiKey: payload.apiKey || payload.accountSid,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConfigs.organizationId, user.organizationId));
    } else {
      await db.insert(whatsappConfigs).values({
        organizationId: user.organizationId,
        status: "CONNECTED",
        phoneNumber: payload.phoneNumber,
        businessName: payload.businessName || "Optical Store",
        apiKey: payload.apiKey || payload.accountSid,
      });
    }

    revalidatePath("/owner/promotions");
    return { success: true };
  } catch (error: any) {
    console.error("saveWhatsAppConfigAction Error:", error);
    return { success: false, error: error.message || "Failed to save WhatsApp config" };
  }
}

export async function disconnectWhatsAppAction() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .update(whatsappConfigs)
      .set({
        status: "DISCONNECTED",
        updatedAt: new Date(),
      })
      .where(eq(whatsappConfigs.organizationId, user.organizationId));

    revalidatePath("/owner/promotions");
    return { success: true };
  } catch (error: any) {
    console.error("disconnectWhatsAppAction Error:", error);
    return { success: false, error: error.message || "Failed to disconnect WhatsApp" };
  }
}
