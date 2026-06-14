"use server";

import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { db } from "@/lib/drizzle";
import { shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ── Singleton MailerSend Client ──
// Initialized once at module level. Avoids re-creating the HTTP client
// on every function call, saving ~15-30ms per request.
let _client: MailerSend | null = null;

function getClient(): MailerSend {
  if (!_client) {
    const apiKey = process.env.MAILERSEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "MAILERSEND_API_KEY is missing. Add it to .env to enable email notifications."
      );
    }
    _client = new MailerSend({ apiKey });
  }
  return _client;
}

// ── From Address (from env — NOT hardcoded) ──
function getFromAddress(): string {
  const addr = process.env.MAILERSEND_FROM_ADDRESS;
  if (!addr) {
    throw new Error(
      "MAILERSEND_FROM_ADDRESS is missing. Add it to .env (e.g. notifications@mail.yourdomain.com)"
    );
  }
  
  // Robust fallback: if env var is just a domain name, prepend 'info@' to form a valid email address
  if (!addr.includes("@")) {
    return "info@" + addr;
  }
  
  return addr;
}

// ── Types ──
interface SendShopEmailParams {
  shopId: string;
  organizationId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Send a transactional email on behalf of a specific shop.
 *
 * - From Address : MAILERSEND_FROM_ADDRESS env var (verified system domain)
 * - From Name    : The shop's registered name (dynamic)
 * - Reply-To     : The shop's registered email (dynamic)
 *
 * Authorization: Validates shopId belongs to organizationId.
 */
export async function sendShopEmail(
  params: SendShopEmailParams
): Promise<SendEmailResult> {
  const {
    shopId, organizationId, recipientEmail,
    recipientName, subject, htmlContent, textContent,
  } = params;

  try {
    // 1. Auth + shop lookup (single indexed query, only 2 columns)
    const [shop] = await db
      .select({ name: shops.name, email: shops.email })
      .from(shops)
      .where(and(eq(shops.id, shopId), eq(shops.organizationId, organizationId)))
      .limit(1);

    if (!shop) {
      return {
        success: false,
        error: `Shop not found or unauthorized. shopId=${shopId}`,
        errorCode: "SHOP_NOT_FOUND",
      };
    }

    // 2. Build identities
    const fromAddress = getFromAddress();
    const fromName = shop.name || "Optical Manager";
    const replyToEmail = shop.email || fromAddress;

    // 3. Assemble payload
    const emailParams = new EmailParams()
      .setFrom(new Sender(fromAddress, fromName))
      .setTo([new Recipient(recipientEmail, recipientName || "")])
      .setReplyTo(new Sender(replyToEmail, fromName))
      .setSubject(subject)
      .setHtml(htmlContent);

    if (textContent) emailParams.setText(textContent);

    // 4. Dispatch
    const response = await getClient().email.send(emailParams);
    const messageId =
      response?.headers?.["x-message-id"] || "accepted";

    return { success: true, messageId: String(messageId) };
  } catch (error: any) {
    const errorBody = error?.body || error?.message || "Unknown MailerSend error";
    const statusCode = error?.statusCode || error?.status || "UNKNOWN";

    console.error(
      `[email.service] Send failed | Shop ID: ${shopId} | ` +
      `To: ${recipientEmail} | Status: ${statusCode} | Error: ${JSON.stringify(errorBody)}`
    );

    return {
      success: false,
      error: typeof errorBody === "string" ? errorBody : JSON.stringify(errorBody),
      errorCode: String(statusCode),
    };
  }
}

/**
 * Get the system email configuration details.
 * Used by the settings UI to display routing info.
 */
export async function getEmailSystemConfig() {
  const fromAddress = process.env.MAILERSEND_FROM_ADDRESS || null;
  const isConfigured = !!(process.env.MAILERSEND_API_KEY && fromAddress);

  return { fromAddress, isConfigured };
}
