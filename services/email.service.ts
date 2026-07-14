"use server";

import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { db } from "@/lib/drizzle";
import { shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ── Singleton MailerSend Client ──
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

interface SendSystemEmailParams {
  recipientEmail: string;
  recipientName?: string;
  replyToEmail?: string;
  replyToName?: string;
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
 */
export async function sendShopEmail(
  params: SendShopEmailParams
): Promise<SendEmailResult> {
  const {
    shopId, organizationId, recipientEmail,
    recipientName, subject, htmlContent, textContent,
  } = params;

  try {
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

    const fromAddress = getFromAddress();
    const fromName = shop.name || "Optical Manager";
    const replyToEmail = shop.email || fromAddress;

    const emailParams = new EmailParams()
      .setFrom(new Sender(fromAddress, fromName))
      .setTo([new Recipient(recipientEmail, recipientName || "")])
      .setReplyTo(new Sender(replyToEmail, fromName))
      .setSubject(subject)
      .setHtml(htmlContent);

    if (textContent) emailParams.setText(textContent);

    const response = await getClient().email.send(emailParams);
    const messageId = response?.headers?.["x-message-id"] || "accepted";

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
 * Send a system notification email (e.g. contact form submission to support@opticalmanager.in).
 */
export async function sendSystemNotificationEmail(
  params: SendSystemEmailParams
): Promise<SendEmailResult> {
  const {
    recipientEmail, recipientName, replyToEmail,
    replyToName, subject, htmlContent, textContent,
  } = params;

  try {
    const fromAddress = getFromAddress();
    const fromName = "Optical Manager System";

    const emailParams = new EmailParams()
      .setFrom(new Sender(fromAddress, fromName))
      .setTo([new Recipient(recipientEmail, recipientName || "")])
      .setSubject(subject)
      .setHtml(htmlContent);

    if (replyToEmail) {
      emailParams.setReplyTo(new Sender(replyToEmail, replyToName || replyToEmail));
    }

    if (textContent) {
      emailParams.setText(textContent);
    }

    const response = await getClient().email.send(emailParams);
    const messageId = response?.headers?.["x-message-id"] || "accepted";

    return { success: true, messageId: String(messageId) };
  } catch (error: any) {
    const errorBody = error?.body || error?.message || "System email dispatch failed";
    console.warn("[sendSystemNotificationEmail] Email alert notice:", errorBody);
    return {
      success: false,
      error: typeof errorBody === "string" ? errorBody : JSON.stringify(errorBody),
    };
  }
}

/**
 * Get the system email configuration details.
 */
export async function getEmailSystemConfig() {
  const fromAddress = process.env.MAILERSEND_FROM_ADDRESS || null;
  const isConfigured = !!(process.env.MAILERSEND_API_KEY && fromAddress);

  return { fromAddress, isConfigured };
}
