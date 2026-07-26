"use server";

import { db } from "@/lib/drizzle";
import { emailTriggers, emailTemplates, shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendShopEmail } from "./email.service";

export type TriggerEvent = 
  | "CUSTOMER_CREATED"
  | "INVOICE_CREATED"
  | "PAYMENT_RECEIVED"
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_REMINDER";

/**
 * Non-blocking Fire-and-Forget Email Trigger System.
 * Looks up active triggers for an event, renders templates with variables,
 * and dispatches emails via Gmail SMTP.
 */
export async function fireEmailTrigger(
  orgId: string,
  shopId: string,
  event: TriggerEvent,
  variables: Record<string, string>,
  recipientEmail: string,
  recipientName?: string
): Promise<void> {
  if (!orgId || !shopId || !recipientEmail) {
    return;
  }

  try {
    // 1. Fast sub-millisecond lookup for active trigger
    const [trigger] = await db
      .select()
      .from(emailTriggers)
      .where(
        and(
          eq(emailTriggers.organizationId, orgId),
          eq(emailTriggers.event, event),
          eq(emailTriggers.isActive, true)
        )
      )
      .limit(1);

    if (!trigger || !trigger.templateId) {
      return; // Exit silently if no active trigger configured
    }

    // 2. Fetch Linked Template
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, trigger.templateId),
          eq(emailTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      console.warn(`[email-trigger] Trigger ${trigger.name} linked to missing/inactive template ${trigger.templateId}`);
      return;
    }

    // 3. Render Variables in Subject & Body
    let renderedSubject = template.subject;
    let renderedBody = template.body;

    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      renderedSubject = renderedSubject.replace(regex, val || "");
      renderedBody = renderedBody.replace(regex, val || "");
    });

    // 4. Dispatch Email Non-blocking
    const sendResult = await sendShopEmail({
      shopId,
      organizationId: orgId,
      recipientEmail,
      recipientName,
      subject: renderedSubject,
      htmlContent: renderedBody,
      priority: trigger.priority as any,
      triggerId: trigger.id,
      templateId: template.id,
      triggerEvent: event,
    });

    // 5. Update Trigger Last Fired Timestamp & Count
    if (sendResult.success) {
      await db
        .update(emailTriggers)
        .set({
          lastTriggeredAt: new Date(),
          triggerCount: (trigger.triggerCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(emailTriggers.id, trigger.id));
    }
  } catch (error) {
    console.error(`[email-trigger] Error firing trigger for event ${event}:`, error);
  }
}
