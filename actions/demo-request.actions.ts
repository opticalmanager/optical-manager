"use server";

import { db } from "@/lib/drizzle";
import { demoRequests } from "@/db/schema";

interface SubmitDemoRequestParams {
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  city?: string;
  notes?: string;
}

export async function submitDemoRequest(params: SubmitDemoRequestParams) {
  const { storeName, ownerName, email, phone, city, notes } = params;

  if (!storeName || !ownerName || !email || !phone) {
    return { success: false, error: "Store name, owner name, email, and phone are required." };
  }

  try {
    const [inserted] = await db
      .insert(demoRequests)
      .values({
        storeName,
        ownerName,
        email,
        phone,
        city: city || null,
        notes: notes || null,
        status: "PENDING",
      })
      .returning();

    return { success: true, id: inserted.id };
  } catch (error: any) {
    console.error("[submitDemoRequest] Insert error:", error);
    return { success: false, error: "Failed to submit demo request. Please try again." };
  }
}
