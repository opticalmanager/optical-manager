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

/**
 * Server action to update status of an appointment (e.g. Check-in or Cancel).
 */
export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const { updateAppointmentStatus } = await import("@/services/appointment.service");
  const res = await updateAppointmentStatus(appointmentId, status);

  if (res.success) {
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/appointments");
    return {
      success: true,
      message: status === "COMPLETED" 
        ? "Patient checked in successfully!" 
        : status === "CANCELLED"
        ? "Appointment visit cancelled."
        : "Appointment status updated.",
    };
  }

  return { success: false, error: res.error || "Failed to update appointment status." };
}

/**
 * Server action for shop staff to create walk-in / phone appointments.
 */
export async function createShopAppointmentAction(payload: {
  customerName: string;
  customerPhone: string;
  visitTime: string;
  purposeOfVisit: string;
  additionalNotes?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.shopId) {
    return { success: false, error: "Unauthorized or no shop assigned." };
  }

  if (!payload.customerName.trim() || !payload.customerPhone.trim()) {
    return { success: false, error: "Customer name and phone number are required." };
  }

  const visitDate = new Date(payload.visitTime);
  if (isNaN(visitDate.getTime())) {
    return { success: false, error: "Invalid appointment date and time." };
  }

  // Prevent past date bookings
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (visitDate < todayStart) {
    return { success: false, error: "Appointments cannot be scheduled for past dates." };
  }

  const { createAppointmentBooking } = await import("@/services/appointment.service");
  const res = await createAppointmentBooking({
    organizationId: user.organizationId,
    shopId: user.shopId,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    visitTime: visitDate,
    purposeOfVisit: payload.purposeOfVisit || "Eye Test / Vision Check",
    additionalNotes: payload.additionalNotes,
  });

  if (res.success && res.data) {
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/appointments");

    const formattedTime = visitDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const dateKey = visitDate.toISOString().split("T")[0];

    const formattedApp = {
      id: res.data.id,
      customerName: res.data.customerName,
      customerPhone: res.data.customerPhone,
      visitTime: formattedTime,
      rawVisitTime: visitDate.toISOString(),
      dateKey,
      purposeOfVisit: res.data.purposeOfVisit,
      status: res.data.status,
      notes: res.data.additionalNotes,
    };

    return {
      success: true,
      message: "New appointment created successfully!",
      data: formattedApp,
    };
  }

  return { success: false, error: res.error || "Failed to create appointment." };
}



