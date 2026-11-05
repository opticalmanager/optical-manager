"use server";

import { sendSystemNotificationEmail } from "@/services/email.service";

export type ContactActionResponse = {
  success: boolean;
  message: string;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Server Action: Process public contact form inquiries from opticalmanager.in
 * Automatically sends an email notification to support@opticalmanager.in with Reply-To set to the sender.
 */
export async function submitContactInquiryAction(
  formData: FormData
): Promise<ContactActionResponse> {
  try {
    const name = formData.get("name")?.toString().trim();
    const phone = formData.get("phone")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const shopName = formData.get("shopName")?.toString().trim() || "Not Specified";
    const message = formData.get("message")?.toString().trim();

    if (!name || !phone || !email || !message) {
      return {
        success: false,
        message: "Please fill in all required fields (Name, Phone, Email, and Message).",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: "Please enter a valid email address.",
      };
    }

    console.log(
      `[Contact Inquiry Received]\n` +
      `• Name: ${name}\n` +
      `• Email: ${email}\n` +
      `• Phone: ${phone}\n` +
      `• Shop: ${shopName}\n` +
      `• Message: ${message}\n` +
      `• Forwarding To: support@opticalmanager.in`
    );

    // Escape all dynamic inputs to prevent stored HTML injection
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeShop = escapeHtml(shopName);
    const safeMessage = escapeHtml(message);

    // HTML Email Template for support team
    const htmlContent = `
      <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #0052cc; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #0052cc; margin: 0; font-size: 20px;">New Website Contact Inquiry</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Received from Optical Manager Landing Page (https://opticalmanager.in)</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 140px;">Sender Name:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Email Address:</td>
            <td style="padding: 8px 0;"><a href="mailto:${safeEmail}" style="color: #0052cc; font-weight: 600; text-decoration: none;">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Phone Number:</td>
            <td style="padding: 8px 0;"><a href="tel:${safePhone}" style="color: #0052cc; font-weight: 600; text-decoration: none;">${safePhone}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Shop / Business:</td>
            <td style="padding: 8px 0; color: #0f172a;">${safeShop}</td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Message / Inquiry:</h4>
          <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
        </div>

        <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          Optical Manager Notification System • support@opticalmanager.in
        </div>
      </div>
    `;

    // Attempt automatic dispatch to support@opticalmanager.in
    await sendSystemNotificationEmail({
      recipientEmail: "support@opticalmanager.in",
      recipientName: "Optical Manager Support",
      replyToEmail: email,
      replyToName: name,
      subject: `[Website Inquiry] ${name} — ${shopName}`,
      htmlContent,
      textContent: `New Inquiry from ${name} (${email}, ${phone}, Shop: ${shopName}):\n\n${message}`,
    });

    return {
      success: true,
      message: "Your inquiry has been submitted successfully! Our team will get back to you shortly.",
    };
  } catch (error: any) {
    console.error("[submitContactInquiryAction] Unexpected error:", error);
    return {
      success: false,
      message: "An unexpected error occurred while sending your message. Please try again or reach out on WhatsApp.",
    };
  }
}
