"use server";

import { db } from "@/lib/drizzle";
import { getCurrentUser } from "@/services/auth.service";
import { whatsappDispatchQueue, shops, whatsappConfigs } from "@/db/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface DispatchWhatsAppPayload {
  phoneNumber: string;
  messageText: string;
  mediaUrl?: string;
  mediaType?: "DOCUMENT" | "IMAGE" | "TEXT";
  templateKey?: string;
  recipientName?: string;
  metadata?: Record<string, any>;
  shopId?: string;
}

export interface ShopPairingInfo {
  pairingKey: string;
  shopId: string;
  shopName: string;
  organizationId: string;
  isOnline: boolean;
  isWaConnected: boolean;
  connectedPhone?: string | null;
  lastActiveAt?: string | null;
}

/**
 * Generates a portable Shop Pairing Key (OM_WA_...) containing encrypted/encoded
 * credentials for the Desktop Assistant to connect to this specific store.
 */
export async function generateShopPairingKeyAction(shopId?: string): Promise<{
  success: boolean;
  data?: ShopPairingInfo;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    // Resolve target shop
    let targetShopId = shopId || user.shopId;
    let targetShop: any = null;

    if (targetShopId) {
      const shopRows = await db
        .select()
        .from(shops)
        .where(and(eq(shops.id, targetShopId), eq(shops.organizationId, user.organizationId)))
        .limit(1);
      targetShop = shopRows[0];
    }

    if (!targetShop) {
      const fallbackShopRows = await db
        .select()
        .from(shops)
        .where(eq(shops.organizationId, user.organizationId))
        .limit(1);
      targetShop = fallbackShopRows[0];
      targetShopId = targetShop?.id;
    }

    if (!targetShop || !targetShopId) {
      return { success: false, error: "No active shop found for this organization." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "Supabase configuration is missing in environment variables." };
    }

    const payload = {
      v: 1,
      orgId: user.organizationId,
      shopId: targetShopId,
      shopName: targetShop.name,
      supabaseUrl,
      supabaseAnonKey,
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    const pairingKey = `OM_WA_${encoded}`;

    // Check recent heartbeat / activity
    const statusCheck = await checkDesktopAssistantStatusAction(targetShopId);

    return {
      success: true,
      data: {
        pairingKey,
        shopId: targetShopId,
        shopName: targetShop.name,
        organizationId: user.organizationId,
        isOnline: statusCheck.isOnline,
        isWaConnected: statusCheck.isWaConnected,
        connectedPhone: statusCheck.connectedPhone,
        lastActiveAt: statusCheck.lastActiveAt,
      },
    };
  } catch (error: any) {
    console.error("generateShopPairingKeyAction Error:", error);
    return { success: false, error: error.message || "Failed to generate pairing key" };
  }
}

/**
 * Dispatches a WhatsApp message to the real-time queue.
 * The local Desktop Assistant listening to this shop picks up and sends the message instantly.
 */
export async function dispatchWhatsAppMessageAction(payload: DispatchWhatsAppPayload): Promise<{
  success: boolean;
  queueId?: string;
  isDesktopOnline?: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!payload.phoneNumber || !payload.messageText) {
      return { success: false, error: "Recipient phone number and message text are required." };
    }

    // Normalize phone number
    let cleanPhone = payload.phoneNumber.replace(/[^\d]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    // Resolve shopId with owner fallback
    let shopId = payload.shopId || user.shopId;
    if (!shopId && user.organizationId) {
      const [firstShop] = await db
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.organizationId, user.organizationId))
        .limit(1);
      shopId = firstShop?.id;
    }

    if (!shopId) {
      return { success: false, error: "Shop ID is required for dispatch routing." };
    }

    // Check if desktop assistant is currently online (last active < 120s)
    const status = await checkDesktopAssistantStatusAction(shopId);

    const insertedRows = await db
      .insert(whatsappDispatchQueue)
      .values({
        organizationId: user.organizationId,
        shopId,
        recipientPhone: cleanPhone,
        recipientName: payload.recipientName || "Valued Customer",
        messageText: payload.messageText,
        mediaUrl: payload.mediaUrl || null,
        mediaType: payload.mediaType || (payload.mediaUrl ? "DOCUMENT" : "TEXT"),
        templateKey: payload.templateKey || "utility",
        metadata: payload.metadata || {},
        status: "PENDING",
      })
      .returning({ id: whatsappDispatchQueue.id });

    const queueId = insertedRows[0]?.id;

    return {
      success: true,
      queueId,
      isDesktopOnline: status.isOnline,
    };
  } catch (error: any) {
    console.error("dispatchWhatsAppMessageAction Error:", error);
    return { success: false, error: error.message || "Failed to enqueue WhatsApp message" };
  }
}

export interface DesktopAssistantStatusResult {
  isOnline: boolean;
  isWaConnected: boolean;
  status: "CONNECTED_READY" | "APP_ONLINE_WA_DISCONNECTED" | "OFFLINE";
  connectedPhone?: string | null;
  lastActiveAt?: string | null;
  pendingCount: number;
  metadata?: any;
}

/**
 * Checks if the Desktop Assistant for a given shop is actively polling, connected,
 * and authenticated to WhatsApp (ready to dispatch messages).
 */
export async function checkDesktopAssistantStatusAction(shopId?: string): Promise<DesktopAssistantStatusResult> {
  try {
    if (!shopId) {
      return { isOnline: false, isWaConnected: false, status: "OFFLINE", pendingCount: 0 };
    }

    // Assistant sends heartbeats every 15s; 45s threshold allows for 2 missed heartbeats
    const fortyFiveSecondsAgo = new Date(Date.now() - 45 * 1000);

    // 1. Check if any heartbeat was updated in the last 45 seconds
    const recentActivity = await db
      .select({
        updatedAt: whatsappDispatchQueue.updatedAt,
        status: whatsappDispatchQueue.status,
        metadata: whatsappDispatchQueue.metadata,
      })
      .from(whatsappDispatchQueue)
      .where(
        and(
          eq(whatsappDispatchQueue.shopId, shopId),
          gt(whatsappDispatchQueue.updatedAt, fortyFiveSecondsAgo)
        )
      )
      .orderBy(desc(whatsappDispatchQueue.updatedAt))
      .limit(1);

    // 2. Check pending queue count (excluding HEARTBEAT and COMMAND rows)
    const pendingRows = await db
      .select({ id: whatsappDispatchQueue.id })
      .from(whatsappDispatchQueue)
      .where(
        and(
          eq(whatsappDispatchQueue.shopId, shopId),
          eq(whatsappDispatchQueue.status, "PENDING")
        )
      )
      .limit(50);

    const isOnline = recentActivity.length > 0;
    const lastActiveAt = recentActivity[0]?.updatedAt?.toISOString() || null;
    const metadata: any = recentActivity[0]?.metadata || null;
    const isWaConnected = Boolean(isOnline && metadata?.isWaConnected);
    const connectedPhone = isWaConnected && metadata?.connectedPhone ? String(metadata.connectedPhone) : null;

    let status: "CONNECTED_READY" | "APP_ONLINE_WA_DISCONNECTED" | "OFFLINE" = "OFFLINE";
    if (isOnline) {
      status = isWaConnected ? "CONNECTED_READY" : "APP_ONLINE_WA_DISCONNECTED";
    }

    return {
      isOnline,
      isWaConnected,
      status,
      connectedPhone,
      lastActiveAt,
      pendingCount: pendingRows.length,
      metadata,
    };
  } catch (error: any) {
    console.warn("checkDesktopAssistantStatusAction Warning:", error.message);
    return { isOnline: false, isWaConnected: false, status: "OFFLINE", pendingCount: 0 };
  }
}

/**
 * Triggers a remote WhatsApp disconnection on the Desktop Assistant.
 * Pushes a control event into whatsapp_dispatch_queue that the Desktop Assistant picks up instantly via Realtime.
 */
export async function triggerDesktopAssistantDisconnectAction(shopId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    let targetShopId = shopId || user.shopId;
    if (!targetShopId) {
      const [firstShop] = await db
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.organizationId, user.organizationId))
        .limit(1);
      targetShopId = firstShop?.id;
    }

    if (!targetShopId) {
      return { success: false, error: "Shop ID is required for disconnect routing." };
    }

    // 1. Enqueue remote control command
    await db.insert(whatsappDispatchQueue).values({
      organizationId: user.organizationId,
      shopId: targetShopId,
      recipientPhone: "CONTROL",
      recipientName: "System Command",
      messageText: "DISCONNECT",
      mediaType: "TEXT",
      templateKey: "CMD_DISCONNECT",
      status: "COMMAND",
      metadata: {
        command: "DISCONNECT",
        triggeredBy: user.id,
        triggeredAt: new Date().toISOString(),
      },
    });

    // 2. Mark existing HEARTBEAT record as disconnected
    await db
      .update(whatsappDispatchQueue)
      .set({
        updatedAt: new Date(),
        messageText: "Desktop Assistant Disconnected",
        metadata: {
          isAlive: true,
          isWaConnected: false,
          connectedPhone: null,
          lastHeartbeat: new Date().toISOString(),
        },
      })
      .where(
        and(
          eq(whatsappDispatchQueue.shopId, targetShopId),
          eq(whatsappDispatchQueue.status, "HEARTBEAT")
        )
      );

    // 3. Mark whatsappConfigs as DISCONNECTED
    await db
      .update(whatsappConfigs)
      .set({
        status: "DISCONNECTED",
        updatedAt: new Date(),
      })
      .where(eq(whatsappConfigs.organizationId, user.organizationId));

    revalidatePath("/owner/promotions");
    revalidatePath("/shop/settings");

    return { success: true };
  } catch (error: any) {
    console.error("triggerDesktopAssistantDisconnectAction Error:", error);
    return { success: false, error: error.message || "Failed to trigger disconnect" };
  }
}

/**
 * Heartbeat action invoked by the Desktop Assistant to register that it is alive.
 */
export async function heartbeatDesktopAssistantAction(payload: {
  shopId: string;
  connectedPhone?: string;
  phoneBattery?: number;
  appVersion?: string;
}): Promise<{ success: boolean }> {
  try {
    if (!payload.shopId) return { success: false };

    const existingConfig = await db
      .select()
      .from(whatsappConfigs)
      .limit(1);

    if (existingConfig.length > 0) {
      await db
        .update(whatsappConfigs)
        .set({
          status: "CONNECTED",
          phoneNumber: payload.connectedPhone || existingConfig[0].phoneNumber,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConfigs.id, existingConfig[0].id));
    }

    return { success: true };
  } catch (err: any) {
    console.warn("heartbeatDesktopAssistantAction Error:", err.message);
    return { success: false };
  }
}
