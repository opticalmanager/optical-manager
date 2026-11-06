"use server";

import { db } from "@/lib/drizzle";
import { subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifySuperAdmin } from "@/services/admin.service";

export interface UpdateTenantSubscriptionPayload {
  organizationId: string;
  plan: "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED";
  expiryDate: string; // ISO format or 'PERPETUAL'
  isLifetime?: boolean;
  maxShops: number;
  maxUsers: number;
  billingCycle: "MONTHLY" | "YEARLY";
  paymentMode?: string;
  amountPaid?: number;
  referenceNumber?: string;
  adminNotes?: string;
}

export async function updateTenantSubscriptionAction(payload: UpdateTenantSubscriptionPayload) {
  try {
    await verifySuperAdmin();

    const {
      organizationId,
      plan,
      status,
      expiryDate,
      isLifetime,
      maxShops,
      maxUsers,
      billingCycle,
      paymentMode,
      amountPaid,
      referenceNumber,
      adminNotes,
    } = payload;

    if (!organizationId) {
      return { success: false, error: "Organization ID is required." };
    }

    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    const now = new Date();
    let currentPeriodEnd: Date;

    if (isLifetime || expiryDate === "PERPETUAL") {
      // Perpetual / Lifetime license (year 2099)
      currentPeriodEnd = new Date("2099-12-31T23:59:59.999Z");
    } else if (expiryDate) {
      currentPeriodEnd = new Date(expiryDate);
    } else {
      currentPeriodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    // Compose formatted audit note log
    const dateStamp = now.toISOString().split("T")[0];
    const logParts: string[] = [
      `[${dateStamp}] Admin Updated: Plan=${plan}, Status=${status}`,
    ];

    if (isLifetime) {
      logParts.push("Validity: Perpetual / Lifetime License");
    } else {
      logParts.push(`Expires: ${currentPeriodEnd.toISOString().split("T")[0]}`);
    }

    if (amountPaid !== undefined && amountPaid > 0) {
      logParts.push(`Paid: ₹${amountPaid.toLocaleString("en-IN")}`);
      if (paymentMode) logParts.push(`Mode: ${paymentMode}`);
      if (referenceNumber?.trim()) logParts.push(`Ref: ${referenceNumber.trim()}`);
    }

    if (adminNotes?.trim()) {
      logParts.push(`Note: ${adminNotes.trim()}`);
    }

    const newLogEntry = logParts.join(" • ");
    const updatedNotes = existingSub?.notes 
      ? `${existingSub.notes}\n${newLogEntry}`
      : newLogEntry;

    if (existingSub) {
      await db
        .update(subscriptions)
        .set({
          plan,
          status,
          currentPeriodEnd,
          trialEndsAt: plan === "TRIAL" ? currentPeriodEnd : null,
          maxShops: maxShops || 5,
          maxUsers: maxUsers || 15,
          billingCycle: billingCycle || "YEARLY",
          notes: updatedNotes,
          updatedAt: now,
        })
        .where(eq(subscriptions.organizationId, organizationId));
    } else {
      await db.insert(subscriptions).values({
        organizationId,
        plan,
        status,
        currentPeriodStart: now,
        currentPeriodEnd,
        trialEndsAt: plan === "TRIAL" ? currentPeriodEnd : null,
        maxShops: maxShops || 5,
        maxUsers: maxUsers || 15,
        billingCycle: billingCycle || "YEARLY",
        notes: updatedNotes,
      });
    }

    revalidatePath(`/admin/organizations/${organizationId}`);
    revalidatePath("/admin/organizations");
    revalidatePath("/admin");

    return { 
      success: true, 
      newPeriodEnd: currentPeriodEnd.toISOString(),
      updatedNotes 
    };
  } catch (err: any) {
    console.error("[updateTenantSubscriptionAction] Error:", err);
    return { success: false, error: err?.message || "Failed to update subscription." };
  }
}
