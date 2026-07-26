"use server";

import nodemailer from "nodemailer";
import { db } from "@/lib/drizzle";
import { 
  emailConfigs, 
  emailTemplates, 
  emailTriggers, 
  emailLogs, 
  shops, 
  organizations 
} from "@/db/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { encryptPassword, decryptPassword } from "@/lib/encrypt";

// ── Types ──
export interface SendShopEmailParams {
  shopId: string;
  organizationId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  priority?: "CRITICAL" | "STANDARD" | "LOW";
  triggerId?: string;
  templateId?: string;
  triggerEvent?: string;
}

export interface SendSystemEmailParams {
  organizationId?: string;
  recipientEmail: string;
  recipientName?: string;
  replyToEmail?: string;
  replyToName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export interface SmtpTestParams {
  emailAddress: string;
  appPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  senderName?: string;
}

/**
 * Fetch Organization's Email Configuration
 */
export async function getEmailConfig(orgId: string) {
  try {
    const [config] = await db
      .select()
      .from(emailConfigs)
      .where(eq(emailConfigs.organizationId, orgId))
      .limit(1);

    if (!config) return null;

    return {
      ...config,
      decryptedPassword: decryptPassword(config.encryptedPassword),
    };
  } catch (error) {
    console.error("[email.service] getEmailConfig error:", error);
    return null;
  }
}

/**
 * Get System Status & Usage Summary for Settings Dashboard
 */
export async function getEmailSystemConfig(orgId?: string) {
  if (!orgId) {
    return {
      isConfigured: false,
      fromAddress: null,
      status: "INACTIVE" as const,
      dailySentCount: 0,
      dailyLimit: 490,
      hourlySentCount: 0,
      hourlyLimit: 250,
    };
  }

  const config = await getEmailConfig(orgId);
  if (!config || config.status !== "ACTIVE") {
    return {
      isConfigured: false,
      fromAddress: config?.emailAddress || null,
      status: config?.status || ("INACTIVE" as const),
      dailySentCount: config?.dailySentCount || 0,
      dailyLimit: config?.dailyLimit || 490,
      hourlySentCount: config?.hourlySentCount || 0,
      hourlyLimit: config?.hourlyLimit || 250,
    };
  }

  return {
    isConfigured: true,
    fromAddress: config.emailAddress,
    senderName: config.senderName || "Optical Manager",
    status: config.status,
    dailySentCount: config.dailySentCount,
    dailyLimit: config.dailyLimit,
    hourlySentCount: config.hourlySentCount,
    hourlyLimit: config.hourlyLimit,
    lastSentAt: config.lastSentAt,
  };
}

/**
 * Verify & Test SMTP Connection (Sends a test email to self)
 */
export async function testSmtpConnection(params: SmtpTestParams): Promise<{ success: boolean; error?: string }> {
  const {
    emailAddress,
    appPassword,
    smtpHost = "smtp.gmail.com",
    smtpPort = 587,
    senderName = "Optical Manager",
  } = params;

  if (!emailAddress || !appPassword) {
    return { success: false, error: "Email address and App Password are required." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // TLS via STARTTLS
      auth: {
        user: emailAddress,
        pass: appPassword,
      },
      tls: {
        rejectUnauthorized: true,
      },
      connectionTimeout: 12000,
    });

    // 1. Verify credentials with SMTP server
    await transporter.verify();

    // 2. Dispatch a verification email to self
    await transporter.sendMail({
      from: `"${senderName}" <${emailAddress}>`,
      to: emailAddress,
      subject: "✨ Optical Manager — Email Connection Verified Successfully",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px; background: #ffffff;">
          <div style="background: #2563eb; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px;">Email Connection Active</h2>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Your Gmail SMTP configuration for <strong>${senderName}</strong> (${emailAddress}) has been successfully verified!
          </p>
          <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #065f46; font-weight: bold;">Status: 100% Operational & Verified</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #047857;">You can now send invoice receipts, appointment reminders, and automated emails to your patients across all your stores.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            Optical Manager — Smart Optical Chain Management Platform
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error("[email.service] testSmtpConnection error:", error);
    let message = error?.message || "Failed to connect to SMTP server.";
    if (message.includes("EAUTH") || message.includes("535")) {
      message = "Invalid Gmail username or App Password. Please make sure 2-Step Verification is enabled and you generated a 16-character App Password.";
    }
    return { success: false, error: message };
  }
}

/**
 * Send Transactional Email for a Specific Shop with Rate Limiting & Queue Logging
 */
export async function sendShopEmail(params: SendShopEmailParams): Promise<SendEmailResult> {
  const {
    shopId,
    organizationId,
    recipientEmail,
    recipientName = "",
    subject,
    htmlContent,
    priority = "STANDARD",
    triggerId,
    templateId,
    triggerEvent,
  } = params;

  try {
    // 1. Fetch Organization Email Config & Credentials
    const config = await getEmailConfig(organizationId);
    if (!config || config.status !== "ACTIVE" || !config.isVerified) {
      return {
        success: false,
        error: "Email service is unconfigured or inactive.",
        errorCode: "NOT_CONFIGURED",
      };
    }

    // 2. Fetch Shop Details for Sender Display Name & Signature
    const [shop] = await db
      .select({ name: shops.name, email: shops.email, settings: shops.settings })
      .from(shops)
      .where(and(eq(shops.id, shopId), eq(shops.organizationId, organizationId)))
      .limit(1);

    const shopName = shop?.name || "Optical Manager Store";
    const shopSignature = (shop?.settings as any)?.emailSignature || "";

    // 3. Enforce Rate Limiting & Reset Counters if Time Windows Expired
    const now = new Date();
    let currentDailyCount = config.dailySentCount;
    let currentHourlyCount = config.hourlySentCount;
    let currentMinuteCount = config.minuteSentCount;

    // Reset minute counter if > 60s
    if (!config.lastMinuteResetAt || now.getTime() - new Date(config.lastMinuteResetAt).getTime() > 60000) {
      currentMinuteCount = 0;
    }

    // Reset hour counter if > 3600s
    if (!config.lastHourResetAt || now.getTime() - new Date(config.lastHourResetAt).getTime() > 3600000) {
      currentHourlyCount = 0;
    }

    // Reset daily counter if > 86400s
    if (!config.lastDailyResetAt || now.getTime() - new Date(config.lastDailyResetAt).getTime() > 86400000) {
      currentDailyCount = 0;
    }

    // Rate Limit Checks (Flexible & generous for optimal UX)
    if (currentMinuteCount >= (config.minuteLimit || 30)) {
      await logEmailAttempt(organizationId, shopId, recipientEmail, recipientName, subject, "RATE_LIMITED", "Minute limit exceeded (30 emails/min)", triggerEvent, shopName, triggerId, templateId);
      return { success: false, error: "Minute rate limit reached (30 emails/min). Please try again in a few seconds.", errorCode: "RATE_LIMITED" };
    }

    if (currentHourlyCount >= (config.hourlyLimit || 250)) {
      await logEmailAttempt(organizationId, shopId, recipientEmail, recipientName, subject, "RATE_LIMITED", "Hourly limit exceeded (250 emails/hr)", triggerEvent, shopName, triggerId, templateId);
      return { success: false, error: "Hourly rate limit reached (250 emails/hr).", errorCode: "RATE_LIMITED" };
    }

    if (currentDailyCount >= (config.dailyLimit || 490)) {
      await logEmailAttempt(organizationId, shopId, recipientEmail, recipientName, subject, "RATE_LIMITED", "Daily cap reached (490 emails/day)", triggerEvent, shopName, triggerId, templateId);
      return { success: false, error: "Daily cap reached (490 emails/day) for Gmail SMTP.", errorCode: "DAILY_LIMIT_REACHED" };
    }

    // Quota Preservation Priority Check (Only skip LOW priority when > 95% of daily limit)
    if (currentDailyCount >= 465 && priority === "LOW") {
      await logEmailAttempt(organizationId, shopId, recipientEmail, recipientName, subject, "RATE_LIMITED", "Low priority email skipped at 95% quota to save remaining capacity for invoices", triggerEvent, shopName, triggerId, templateId);
      return { success: false, error: "Daily quota preserved for critical invoice dispatches.", errorCode: "QUOTA_PRESERVED" };
    }

    // 4. Construct Final Email HTML with Signature
    let finalHtml = htmlContent;
    if (shopSignature) {
      finalHtml += `<br/><hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;"/><div style="font-size:12px; color:#64748b;">${shopSignature}</div>`;
    }

    // 5. Dispatch via Nodemailer
    const senderDisplayName = `${shopName} via ${config.senderName || "Optical Manager"}`;
    const replyTo = shop?.email || config.emailAddress;

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: false,
      auth: {
        user: config.emailAddress,
        pass: config.decryptedPassword,
      },
      tls: {
        rejectUnauthorized: true,
      },
      connectionTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `"${senderDisplayName}" <${config.emailAddress}>`,
      to: recipientName ? `"${recipientName}" <${recipientEmail}>` : recipientEmail,
      replyTo: replyTo,
      subject: subject,
      html: finalHtml,
    });

    // 6. Update Rate Counters Atomically in DB
    await db
      .update(emailConfigs)
      .set({
        dailySentCount: currentDailyCount + 1,
        hourlySentCount: currentHourlyCount + 1,
        minuteSentCount: currentMinuteCount + 1,
        lastSentAt: now,
        lastMinuteResetAt: currentMinuteCount === 0 ? now : config.lastMinuteResetAt,
        lastHourResetAt: currentHourlyCount === 0 ? now : config.lastHourResetAt,
        lastDailyResetAt: currentDailyCount === 0 ? now : config.lastDailyResetAt,
        updatedAt: now,
      })
      .where(eq(emailConfigs.id, config.id));

    // 7. Log Success
    await logEmailAttempt(
      organizationId,
      shopId,
      recipientEmail,
      recipientName,
      subject,
      "SENT",
      undefined,
      triggerEvent,
      shopName,
      triggerId,
      templateId,
      info.messageId
    );

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error("[email.service] sendShopEmail error:", error);

    await logEmailAttempt(
      organizationId,
      shopId,
      recipientEmail,
      recipientName,
      subject,
      "FAILED",
      error?.message || "SMTP dispatch error",
      triggerEvent,
      undefined,
      triggerId,
      templateId
    );

    return {
      success: false,
      error: error?.message || "Failed to dispatch email via Gmail SMTP.",
    };
  }
}

/**
 * Send System Notification Email
 */
export async function sendSystemNotificationEmail(params: SendSystemEmailParams): Promise<SendEmailResult> {
  const { organizationId, recipientEmail, recipientName, subject, htmlContent } = params;

  if (!organizationId) {
    return { success: false, error: "Organization ID is required." };
  }

  const config = await getEmailConfig(organizationId);
  if (!config || config.status !== "ACTIVE") {
    return { success: false, error: "System email config inactive." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: false,
      auth: {
        user: config.emailAddress,
        pass: config.decryptedPassword,
      },
    });

    const info = await transporter.sendMail({
      from: `"${config.senderName || "Optical Manager Support"}" <${config.emailAddress}>`,
      to: recipientName ? `"${recipientName}" <${recipientEmail}>` : recipientEmail,
      subject: subject,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[email.service] sendSystemNotificationEmail error:", error);
    return { success: false, error: error?.message || "Failed to send system notification email" };
  }
}

/**
 * Internal Log Helper for email_logs
 */
async function logEmailAttempt(
  orgId: string,
  shopId?: string,
  recipientEmail?: string,
  recipientName?: string,
  subject?: string,
  status: "SENT" | "FAILED" | "RATE_LIMITED" | "QUEUED" = "QUEUED",
  errorMessage?: string,
  triggerEvent?: string,
  shopName?: string,
  triggerId?: string,
  templateId?: string,
  messageId?: string
) {
  try {
    await db.insert(emailLogs).values({
      organizationId: orgId,
      shopId: shopId || null,
      triggerId: triggerId || null,
      templateId: templateId || null,
      recipientEmail: recipientEmail || "unknown",
      recipientName: recipientName || null,
      subject: subject || "No Subject",
      status: status,
      errorMessage: errorMessage || null,
      triggerEvent: triggerEvent || null,
      shopName: shopName || null,
      messageId: messageId || null,
    });
  } catch (err) {
    console.error("[email.service] logEmailAttempt error:", err);
  }
}

/**
 * Get Per-Shop Usage Analytics for Dashboard
 */
export async function getEmailUsageStats(orgId: string) {
  try {
    const logs = await db
      .select({
        shopId: emailLogs.shopId,
        shopName: emailLogs.shopName,
        status: emailLogs.status,
      })
      .from(emailLogs)
      .where(eq(emailLogs.organizationId, orgId));

    const breakdown: Record<string, { shopName: string; sent: number; failed: number }> = {};

    logs.forEach((log) => {
      const key = log.shopId || "system";
      const name = log.shopName || "System / Admin";
      if (!breakdown[key]) {
        breakdown[key] = { shopName: name, sent: 0, failed: 0 };
      }
      if (log.status === "SENT") breakdown[key].sent += 1;
      if (log.status === "FAILED") breakdown[key].failed += 1;
    });

    return Object.values(breakdown);
  } catch (error) {
    console.error("[email.service] getEmailUsageStats error:", error);
    return [];
  }
}
