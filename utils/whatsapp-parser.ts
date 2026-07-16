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
