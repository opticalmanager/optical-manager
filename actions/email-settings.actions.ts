"use server";

import { db } from "@/lib/drizzle";
import { 
  emailConfigs, 
  emailTemplates, 
  emailTriggers, 
  emailLogs, 
  shops,
  organizations 
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/services/auth.service";
import { encryptPassword } from "@/lib/encrypt";
import { testSmtpConnection, sendShopEmail } from "@/services/email.service";

/**
 * 1. Save / Update Gmail SMTP Configuration & Run Verification Test
 */
export async function saveEmailConfigAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  const emailAddress = (formData.get("emailAddress") as string)?.trim().toLowerCase();
  const appPassword = (formData.get("appPassword") as string)?.trim().replace(/\s+/g, "");
  const senderName = (formData.get("senderName") as string)?.trim() || "Optical Manager";

  if (!emailAddress || !emailAddress.includes("@")) {
    return { success: false, error: "Please provide a valid Gmail address." };
  }

  if (!appPassword || appPassword.length < 16) {
    return { success: false, error: "App Password must be a 16-character string from Google App Passwords." };
  }

  try {
    // 1. Verify credentials by sending a test email to self
    const testResult = await testSmtpConnection({
      emailAddress,
      appPassword,
      senderName,
    });

    if (!testResult.success) {
      return { success: false, error: testResult.error || "SMTP Verification Failed." };
    }

    // 2. Encrypt Password
    const encryptedPassword = encryptPassword(appPassword);

    // 3. Upsert into email_configs
    const existingConfig = await db
      .select()
      .from(emailConfigs)
      .where(eq(emailConfigs.organizationId, user.organizationId))
      .limit(1);

    if (existingConfig.length > 0) {
      await db
        .update(emailConfigs)
        .set({
          emailAddress,
          encryptedPassword,
          senderName,
          isVerified: true,
          status: "ACTIVE",
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(emailConfigs.organizationId, user.organizationId));
    } else {
      await db.insert(emailConfigs).values({
        organizationId: user.organizationId,
        provider: "GMAIL",
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        emailAddress,
        encryptedPassword,
        senderName,
        isVerified: true,
        status: "ACTIVE",
      });

      // Seed Default Templates & Triggers on First Setup
      await seedDefaultTemplatesAndTriggers(user.organizationId);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[saveEmailConfigAction] error:", error);
    return { success: false, error: error?.message || "Failed to save email configuration." };
  }
}

/**
 * 2. Disconnect Gmail SMTP Account
 */
export async function disconnectEmailAction() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    await db
      .update(emailConfigs)
      .set({
        status: "INACTIVE",
        isVerified: false,
        encryptedPassword: "",
        lastError: "Disconnected by user",
        updatedAt: new Date(),
      })
      .where(eq(emailConfigs.organizationId, user.organizationId));

    // Deactivate triggers
    await db
      .update(emailTriggers)
      .set({ isActive: false })
      .where(eq(emailTriggers.organizationId, user.organizationId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to disconnect email account." };
  }
}

/**
 * 2b. Test Existing Email Connection
 */
export async function testEmailConnectionAction() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const [config] = await db
      .select()
      .from(emailConfigs)
      .where(eq(emailConfigs.organizationId, user.organizationId))
      .limit(1);

    if (!config || !config.emailAddress || !config.encryptedPassword) {
      return { success: false, error: "Email configuration not found or incomplete." };
    }

    const { decryptPassword } = await import("@/lib/encrypt");
    const appPassword = decryptPassword(config.encryptedPassword);

    return await testSmtpConnection({
      emailAddress: config.emailAddress,
      appPassword,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      senderName: config.senderName || "Optical Manager",
    });
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to test connection." };
  }
}

/**
 * 3. Save / Update Email Template
 */
export async function saveEmailTemplateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const category = (formData.get("category") as string) || "CUSTOM";
  const variablesJson = (formData.get("variables") as string) || "[]";

  if (!name || !subject || !body) {
    return { success: false, error: "Name, Subject, and Body are required." };
  }

  try {
    let variables = [];
    try {
      variables = JSON.parse(variablesJson);
    } catch (e) {
      variables = [];
    }

    if (id) {
      await db
        .update(emailTemplates)
        .set({
          name,
          subject,
          body,
          category: category as any,
          variables,
          updatedAt: new Date(),
        })
        .where(and(eq(emailTemplates.id, id), eq(emailTemplates.organizationId, user.organizationId)));
    } else {
      await db.insert(emailTemplates).values({
        organizationId: user.organizationId,
        name,
        subject,
        body,
        category: category as any,
        variables,
        isDefault: false,
        isActive: true,
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save template." };
  }
}

/**
 * 4. Toggle Template Active State
 */
export async function toggleEmailTemplateAction(templateId: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    await db
      .update(emailTemplates)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.organizationId, user.organizationId)));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to toggle template." };
  }
}

/**
 * 5. Soft Delete Email Template
 */
export async function deleteEmailTemplateAction(templateId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    await db
      .update(emailTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.organizationId, user.organizationId)));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete template." };
  }
}

/**
 * 6. Toggle Automated Trigger Rule Active State
 */
export async function toggleEmailTriggerAction(triggerId: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    if (isActive) {
      const [trigger] = await db
        .select()
        .from(emailTriggers)
        .where(and(eq(emailTriggers.id, triggerId), eq(emailTriggers.organizationId, user.organizationId)))
        .limit(1);

      if (!trigger || !trigger.templateId) {
        return { success: false, error: "Cannot activate a trigger without a linked template." };
      }
    }

    await db
      .update(emailTriggers)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(emailTriggers.id, triggerId), eq(emailTriggers.organizationId, user.organizationId)));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to toggle trigger." };
  }
}

/**
 * 7. Link Template to Trigger Rule
 */
export async function updateTriggerTemplateAction(triggerId: string, templateId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const [template] = await db
      .select({ name: emailTemplates.name })
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.organizationId, user.organizationId)))
      .limit(1);

    if (!template) {
      return { success: false, error: "Template not found." };
    }

    await db
      .update(emailTriggers)
      .set({
        templateId,
        templateName: template.name,
        updatedAt: new Date(),
      })
      .where(and(eq(emailTriggers.id, triggerId), eq(emailTriggers.organizationId, user.organizationId)));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update trigger template." };
  }
}

/**
 * 8. Send Test Email for a Trigger Rule
 */
export async function sendTestTriggerEmailAction(triggerId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const [trigger] = await db
      .select()
      .from(emailTriggers)
      .where(and(eq(emailTriggers.id, triggerId), eq(emailTriggers.organizationId, user.organizationId)))
      .limit(1);

    if (!trigger || !trigger.templateId) {
      return { success: false, error: "Trigger has no linked template." };
    }

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, trigger.templateId), eq(emailTemplates.organizationId, user.organizationId)))
      .limit(1);

    if (!template) {
      return { success: false, error: "Linked template not found." };
    }

    const [firstShop] = await db
      .select()
      .from(shops)
      .where(eq(shops.organizationId, user.organizationId))
      .limit(1);

    const [config] = await db
      .select({ emailAddress: emailConfigs.emailAddress })
      .from(emailConfigs)
      .where(eq(emailConfigs.organizationId, user.organizationId))
      .limit(1);

    if (!config) {
      return { success: false, error: "Email service unconfigured." };
    }

    const sampleVars: Record<string, string> = {
      customer_name: "Rahul Sharma (Sample)",
      customer_email: config.emailAddress,
      customer_phone: "+91 98765 43210",
      invoice_number: "INV-00124",
      total: "₹4,500.00",
      balance_due: "₹2,000.00",
      amount_paid: "₹2,500.00",
      payment_method: "UPI",
      appointment_date: "28 Jul 2025",
      appointment_time: "10:30 AM",
      shop_name: firstShop?.name || "Vision Care Optics",
      shop_address: firstShop?.address || "MG Road, Narsapur",
      shop_phone: firstShop?.phone || "+91 98765 43210",
    };

    let subject = template.subject;
    let body = template.body;

    Object.entries(sampleVars).forEach(([k, v]) => {
      subject = subject.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
      body = body.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
    });

    const res = await sendShopEmail({
      shopId: firstShop?.id || "sample-shop",
      organizationId: user.organizationId,
      recipientEmail: config.emailAddress,
      recipientName: "Store Owner",
      subject: `[TEST] ${subject}`,
      htmlContent: body,
      priority: "CRITICAL",
      triggerEvent: "TEST_TRIGGER",
    });

    if (res.success) {
      return { success: true, message: `Test email dispatched to ${config.emailAddress}` };
    } else {
      return { success: false, error: res.error || "Failed to dispatch test email." };
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to send test trigger email." };
  }
}

/**
 * 9. Save Per-Shop Email Signature
 */
export async function saveShopSignatureAction(shopId: string, signatureHtml: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const [shop] = await db
      .select({ settings: shops.settings })
      .from(shops)
      .where(and(eq(shops.id, shopId), eq(shops.organizationId, user.organizationId)))
      .limit(1);

    if (!shop) {
      return { success: false, error: "Shop not found." };
    }

    const updatedSettings = {
      ...(shop.settings || {}),
      emailSignature: signatureHtml,
    };

    await db
      .update(shops)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(eq(shops.id, shopId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save shop signature." };
  }
}

/**
 * Helper: Seed 5 Default Templates and 5 Default Triggers on First Setup
 */
async function seedDefaultTemplatesAndTriggers(orgId: string) {
  const defaults = [
    {
      name: "Invoice Receipt",
      category: "INVOICE" as const,
      subject: "Invoice #{{invoice_number}} from {{shop_name}}",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: #2563eb; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">{{shop_name}}</h2>
            <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 13px;">Official Tax Invoice & Receipt</p>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <p>Dear <strong>{{customer_name}}</strong>,</p>
            <p>Thank you for choosing {{shop_name}}! Here are the details of your recent prescription purchase (Invoice #<strong>{{invoice_number}}</strong>):</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr><td style="padding: 4px 0; color: #64748b;">Invoice Number:</td><td style="text-align: right; font-weight: bold;">{{invoice_number}}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;">Total Amount:</td><td style="text-align: right; font-weight: bold; color: #1e293b;">{{total}}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;">Balance Due:</td><td style="text-align: right; font-weight: bold; color: #dc2626;">{{balance_due}}</td></tr>
              </table>
            </div>
            <p>If you have any questions about your order or prescription, feel free to visit our store or call us at {{shop_phone}}.</p>
            <p style="margin-top: 24px;">Best regards,<br/><strong>{{shop_name}} Team</strong><br/><span style="font-size: 12px; color: #64748b;">{{shop_address}}</span></p>
          </div>
        </div>
      `,
      variables: [
        { key: "{{customer_name}}", label: "Customer Name" },
        { key: "{{invoice_number}}", label: "Invoice Number" },
        { key: "{{total}}", label: "Total Amount" },
        { key: "{{balance_due}}", label: "Balance Due" },
        { key: "{{shop_name}}", label: "Shop Name" },
        { key: "{{shop_address}}", label: "Shop Address" },
        { key: "{{shop_phone}}", label: "Shop Phone" },
      ],
    },
    {
      name: "Payment Confirmation",
      category: "RECEIPT" as const,
      subject: "Payment Received — Thank you {{customer_name}}",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: #059669; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Payment Receipt</h2>
            <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 13px;">{{shop_name}}</p>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <p>Dear <strong>{{customer_name}}</strong>,</p>
            <p>We have successfully received your payment of <strong>{{amount_paid}}</strong> via {{payment_method}} for Invoice #<strong>{{invoice_number}}</strong>.</p>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #065f46; font-weight: bold;">Amount Paid: {{amount_paid}}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #047857;">Remaining Balance: {{balance_due}}</p>
            </div>
            <p>Thank you for your prompt payment!</p>
            <p style="margin-top: 24px;">Warm regards,<br/><strong>{{shop_name}}</strong></p>
          </div>
        </div>
      `,
      variables: [
        { key: "{{customer_name}}", label: "Customer Name" },
        { key: "{{amount_paid}}", label: "Amount Paid" },
        { key: "{{payment_method}}", label: "Payment Method" },
        { key: "{{invoice_number}}", label: "Invoice Number" },
        { key: "{{balance_due}}", label: "Balance Due" },
        { key: "{{shop_name}}", label: "Shop Name" },
      ],
    },
    {
      name: "Welcome New Patient",
      category: "WELCOME" as const,
      subject: "Welcome to {{shop_name}}! 👋",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: #4f46e5; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Welcome to Our Store</h2>
            <p style="color: #c7d2fe; margin: 4px 0 0 0; font-size: 13px;">{{shop_name}}</p>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <p>Dear <strong>{{customer_name}}</strong>,</p>
            <p>Welcome to <strong>{{shop_name}}</strong>! We are excited to serve your vision care needs with precision lens fitting and premium frames.</p>
            <p>Your patient record has been registered. You will receive digital invoices and eye exam records directly to your inbox.</p>
            <p style="margin-top: 24px;">Visit us anytime at:<br/><strong>{{shop_address}}</strong><br/>Phone: {{shop_phone}}</p>
          </div>
        </div>
      `,
      variables: [
        { key: "{{customer_name}}", label: "Customer Name" },
        { key: "{{shop_name}}", label: "Shop Name" },
        { key: "{{shop_address}}", label: "Shop Address" },
        { key: "{{shop_phone}}", label: "Shop Phone" },
      ],
    },
    {
      name: "Appointment Confirmation",
      category: "APPOINTMENT" as const,
      subject: "Appointment Confirmed — {{appointment_date}} at {{shop_name}}",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: #7c3aed; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Eye Exam Confirmed</h2>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <p>Dear <strong>{{customer_name}}</strong>,</p>
            <p>Your appointment for an eye exam at <strong>{{shop_name}}</strong> has been confirmed!</p>
            <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 12px 16px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #5b21b6;">Date: {{appointment_date}}</p>
              <p style="margin: 4px 0 0 0; font-weight: bold; color: #5b21b6;">Time: {{appointment_time}}</p>
            </div>
            <p>Location: {{shop_address}}</p>
          </div>
        </div>
      `,
      variables: [
        { key: "{{customer_name}}", label: "Customer Name" },
        { key: "{{appointment_date}}", label: "Appointment Date" },
        { key: "{{appointment_time}}", label: "Appointment Time" },
        { key: "{{shop_name}}", label: "Shop Name" },
        { key: "{{shop_address}}", label: "Shop Address" },
      ],
    },
  ];

  for (const t of defaults) {
    const [insertedTpl] = await db
      .insert(emailTemplates)
      .values({
        organizationId: orgId,
        name: t.name,
        category: t.category,
        subject: t.subject,
        body: t.body,
        variables: t.variables,
        isDefault: true,
        isActive: true,
      })
      .returning({ id: emailTemplates.id, name: emailTemplates.name });

    // Seed matching trigger
    let eventName: any = "INVOICE_CREATED";
    let priority: any = "STANDARD";

    if (t.category === "INVOICE") { eventName = "INVOICE_CREATED"; priority = "CRITICAL"; }
    else if (t.category === "RECEIPT") { eventName = "PAYMENT_RECEIVED"; priority = "CRITICAL"; }
    else if (t.category === "WELCOME") { eventName = "CUSTOMER_CREATED"; priority = "LOW"; }
    else if (t.category === "APPOINTMENT") { eventName = "APPOINTMENT_BOOKED"; priority = "STANDARD"; }

    await db.insert(emailTriggers).values({
      organizationId: orgId,
      name: `Auto ${t.name}`,
      event: eventName,
      templateId: insertedTpl.id,
      templateName: insertedTpl.name,
      priority: priority,
      isActive: false, // Default inactive until user enables
      description: `Automatically send ${t.name} when ${eventName.toLowerCase()} event occurs.`,
    });
  }
}
