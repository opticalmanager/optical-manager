/**
 * Parse WhatsApp Template Variables
 * Matches placeholders like {{customer_name}} or {{ customer_name }} (case-insensitive)
 * and replaces them with matching values from the variables dictionary.
 */
export function parseWhatsAppTemplate(template: string, variables: Record<string, string>): string {
  if (!template) return "";
  let result = template;
  Object.entries(variables).forEach(([key, val]) => {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    result = result.replace(placeholder, val || "");
  });
  return result;
}

/**
 * Universal WhatsApp Chat Dispatcher
 * Works seamlessly across Desktop (Windows/macOS) and Mobile (Android/iOS).
 * Automatically formats 10-digit Indian phone numbers with country code +91.
 * On Desktop: Attempts launching native WhatsApp Desktop App first via protocol handler.
 * If WhatsApp Desktop App is not installed or available, gracefully opens WhatsApp Web / API fallback.
 */
export function openWhatsAppChat(phoneNumber: string, messageText: string): void {
  if (!phoneNumber) return;

  // 1. Clean non-digit characters
  let cleanPhone = phoneNumber.replace(/[^\d]/g, "");

  // 2. Prepend country code '91' for standard 10-digit Indian phone numbers
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const encodedText = encodeURIComponent(messageText);

  // 3. Detect mobile platform
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Mobile native app link
    window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    // Desktop (Windows / macOS):
    // 1. App protocol URL for native desktop application
    const appProtocolUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    // 2. Direct WhatsApp Web URL (bypasses api.whatsapp.com landing page completely)
    const directWebUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    let appLaunched = false;

    // Listen for window blur (triggered when native Desktop App takes window focus)
    const handleBlur = () => {
      appLaunched = true;
    };
    window.addEventListener("blur", handleBlur, { once: true });

    // Attempt native desktop app launch via invisible iframe
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    try {
      iframe.src = appProtocolUrl;
    } catch (err) {
      console.warn("[WhatsApp Dispatcher] Desktop app protocol launch error:", err);
    }

    // Fallback timer: if desktop app didn't launch / take focus within 500ms, directly launch WhatsApp Web
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      window.removeEventListener("blur", handleBlur);

      if (!appLaunched) {
        window.open(directWebUrl, "whatsapp_workspace_tab");
      }
    }, 500);
  }
}

export interface SendWhatsAppOptions {
  phoneNumber: string;
  messageText: string;
  mediaUrl?: string;
  mediaType?: "DOCUMENT" | "IMAGE" | "TEXT";
  templateKey?: string;
  recipientName?: string;
  shopId?: string;
  shopSettings?: any;
  metadata?: Record<string, any>;
  showToast?: boolean;
}

export interface SendWhatsAppResult {
  success: boolean;
  mode: "desktop_assistant" | "whatsapp_web" | "official_api";
  isDesktopOnline?: boolean;
  queueId?: string;
  error?: string;
}

/**
 * Universal 1-Click WhatsApp Dispatcher.
 * Automatically checks the shop's active configuration (Optical Manager Tool vs. WhatsApp Web vs. Official API)
 * and delivers the message with seamless 1-click execution and graceful fallback.
 */
export async function sendUniversalWhatsAppMessage(
  options: SendWhatsAppOptions,
  dispatchAction: (payload: any) => Promise<{
    success: boolean;
    queueId?: string;
    isDesktopOnline?: boolean;
    error?: string;
  }>
): Promise<SendWhatsAppResult> {
  const {
    phoneNumber,
    messageText,
    mediaUrl,
    mediaType = "DOCUMENT",
    templateKey = "utility",
    recipientName = "Valued Customer",
    shopId,
    shopSettings,
    metadata = {},
    showToast = true,
  } = options;

  if (!phoneNumber || !phoneNumber.trim()) {
    return { success: false, mode: "whatsapp_web", error: "Missing phone number" };
  }

  // Resolve dispatch mode from store settings (defaults to desktop_assistant if configured, else whatsapp_web)
  const dispatchMode: "whatsapp_web" | "desktop_assistant" | "official_api" =
    shopSettings?.whatsappDispatchMode || "whatsapp_web";

  // 1. OPTICAL MANAGER TOOL (DESKTOP ASSISTANT - 1-CLICK BACKGROUND DISPATCH)
  if (dispatchMode === "desktop_assistant") {
    try {
      const res = await dispatchAction({
        phoneNumber,
        messageText,
        mediaUrl,
        mediaType,
        templateKey,
        recipientName,
        shopId,
        metadata,
      });

      if (res.success) {
        return {
          success: true,
          mode: "desktop_assistant",
          isDesktopOnline: res.isDesktopOnline,
          queueId: res.queueId,
        };
      }

      // If server action returned failure, launch browser fallback
      openWhatsAppChat(phoneNumber, messageText);
      return { success: true, mode: "whatsapp_web", isDesktopOnline: false };
    } catch (err: any) {
      console.warn("[sendUniversalWhatsAppMessage] Desktop assistant error, falling back to Web:", err);
      openWhatsAppChat(phoneNumber, messageText);
      return { success: true, mode: "whatsapp_web", isDesktopOnline: false };
    }
  }

  // 2. OFFICIAL META CLOUD API
  if (dispatchMode === "official_api") {
    if (shopSettings?.metaCloudApi?.isConfigured) {
      return { success: true, mode: "official_api" };
    } else {
      openWhatsAppChat(phoneNumber, messageText);
      return { success: true, mode: "whatsapp_web" };
    }
  }

  // 3. WHATSAPP WEB (DEFAULT DIRECT BROWSER / APP LAUNCH)
  openWhatsAppChat(phoneNumber, messageText);
  return { success: true, mode: "whatsapp_web" };
}

