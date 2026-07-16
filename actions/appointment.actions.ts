"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { updateAppointmentConfig, createAppointmentBooking } from "@/services/appointment.service";
import { FormFieldConfig } from "@/db/schema/appointment-configs";

/**
 * Server action to save owner's appointment builder settings.
 */
export async function saveAppointmentConfigAction(payload: {
  formFields: FormFieldConfig[];
  visitPurposes: string[];
  pageTitle: string;
  pageSubtitle: string;
  primaryColor: string;
  buttonText: string;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return { success: false, error: "Unauthorized." };
  }

  const res = await updateAppointmentConfig(user.organizationId, payload);
  if (res.success) {
    revalidatePath("/owner/settings/appointments");
    return { success: true, message: "Appointment page settings saved successfully!" };
  }

  return { success: false, error: res.error || "Failed to save settings." };
}

/**
 * Public server action for submitting customer appointment bookings.
 */
export async function submitAppointmentAction(payload: {
  organizationId: string;
  shopId: string;
  customerName: string;
  customerPhone: string;
  visitTime: string;
  purposeOfVisit: string;
  additionalNotes?: string;
}) {
  if (!payload.organizationId || !payload.shopId) {
    return { success: false, error: "Please select a branch location." };
  }

  if (!payload.customerName.trim() || !payload.customerPhone.trim()) {
    return { success: false, error: "Name and phone number are required." };
  }

  if (!payload.visitTime) {
    return { success: false, error: "Please select a visit date and time." };
  }

  const visitDate = new Date(payload.visitTime);
  if (isNaN(visitDate.getTime())) {
    return { success: false, error: "Invalid visit date format." };
  }

  const res = await createAppointmentBooking({
    organizationId: payload.organizationId,
    shopId: payload.shopId,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    visitTime: visitDate,
    purposeOfVisit: payload.purposeOfVisit || "Vision Examination",
    additionalNotes: payload.additionalNotes,
  });

  if (res.success) {
    return {
      success: true,
      message: "Your appointment has been successfully scheduled! The branch staff will contact you shortly.",
    };
  }

  return { success: false, error: res.error || "Failed to submit booking." };
}
