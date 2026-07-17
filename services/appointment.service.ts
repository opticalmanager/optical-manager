"use server";

import { db } from "@/lib/drizzle";
import { appointmentConfigs, appointments, organizations, shops } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FormFieldConfig } from "@/db/schema/appointment-configs";

/**
 * Retrieves the appointment configuration for an organization.
 * If no configuration exists yet, creates a default row.
 */
export async function getAppointmentConfig(organizationId: string) {
  try {
    const [existing] = await db
      .select()
      .from(appointmentConfigs)
      .where(eq(appointmentConfigs.organizationId, organizationId))
      .limit(1);

    if (existing) {
      return { success: true, data: existing };
    }

    // Default configuration insertion
    const [created] = await db
      .insert(appointmentConfigs)
      .values({
        organizationId,
      })
      .returning();

    return { success: true, data: created };
  } catch (error) {
    console.error("[getAppointmentConfig] error:", error);
    return { success: false, error: "Failed to load appointment configuration." };
  }
}

/**
 * Updates an organization's appointment configuration.
 */
export async function updateAppointmentConfig(
  organizationId: string,
  payload: {
    formFields?: FormFieldConfig[];
    visitPurposes?: string[];
    pageTitle?: string;
    pageSubtitle?: string;
    primaryColor?: string;
    buttonText?: string;
    isPublished?: boolean;
  }
) {
  try {
    const [updated] = await db
      .insert(appointmentConfigs)
      .values({
        organizationId,
        ...payload,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appointmentConfigs.organizationId,
        set: {
          ...payload,
          updatedAt: new Date(),
        },
      })
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateAppointmentConfig] error:", error);
    return { success: false, error: "Failed to save appointment configuration." };
  }
}

/**
 * Public function to fetch organization booking page data by organization slug.
 * Used by the public booking page /book/[slug].
 */
export async function getPublicAppointmentData(orgSlug: string) {
  try {
    // Find organization by slug
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (!org) {
      return null;
    }

    // Fetch active shops/branches for this org
    const orgShops = await db
      .select({
        id: shops.id,
        name: shops.name,
        address: shops.address,
        phone: shops.phone,
      })
      .from(shops)
      .where(eq(shops.organizationId, org.id));

    // Fetch appointment configuration
    const [config] = await db
      .select()
      .from(appointmentConfigs)
      .where(eq(appointmentConfigs.organizationId, org.id))
      .limit(1);

    const defaultConfig = {
      formFields: [
        { id: "full_name", label: "Full Name", type: "text", enabled: true, required: true, icon: "user" },
        { id: "phone_number", label: "Phone Number", type: "tel", enabled: true, required: true, icon: "phone" },
        { id: "time_to_visit", label: "Time to Visit", type: "datetime", enabled: true, required: true, icon: "clock" },
        { id: "select_branch", label: "Select Branch", type: "select", enabled: true, required: true, icon: "map-pin" },
        { id: "purpose_of_visit", label: "Purpose of Visit", type: "select", enabled: true, required: true, icon: "message-square" },
        { id: "additional_notes", label: "Additional Notes", type: "textarea", enabled: false, required: false, icon: "file-text" },
      ],
      visitPurposes: [
        "Eye Test / Vision Check",
        "Contact Lens Consultation",
        "Frame Selection",
      ],
      pageTitle: "Book Your Appointment",
      pageSubtitle: "Schedule your visit with our experts. We're here to help you see better.",
      primaryColor: "#2563EB",
      buttonText: "Book Appointment",
      isPublished: true,
    };

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        phone: org.phone,
        email: org.email,
        address: org.address,
        logoUrl: org.logoUrl,
      },
      shops: orgShops,
      config: config || defaultConfig,
    };
  } catch (error) {
    console.error("[getPublicAppointmentData] error:", error);
    return null;
  }
}

/**
 * Creates a new customer appointment booking.
 */
export async function createAppointmentBooking(payload: {
  organizationId: string;
  shopId: string;
  customerName: string;
  customerPhone: string;
  visitTime: Date;
  purposeOfVisit: string;
  additionalNotes?: string;
}) {
  try {
    const [appointment] = await db
      .insert(appointments)
      .values({
        organizationId: payload.organizationId,
        shopId: payload.shopId,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        visitTime: payload.visitTime,
        purposeOfVisit: payload.purposeOfVisit,
        additionalNotes: payload.additionalNotes || null,
        status: "PENDING",
      })
      .returning();

    return { success: true, data: appointment };
  } catch (error) {
    console.error("[createAppointmentBooking] error:", error);
    return { success: false, error: "Failed to create appointment booking." };
  }
}

/**
 * Updates status of an existing appointment booking.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
) {
  try {
    const [updated] = await db
      .update(appointments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    console.error("[updateAppointmentStatus] error:", error);
    return { success: false, error: "Failed to update appointment status." };
  }
}

export interface CalendarAppointmentItem {
  id: string;
  customerName: string;
  customerPhone: string;
  visitTime: string;
  rawVisitTime?: string;
  dateKey: string;
  purposeOfVisit: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
}

export interface AppointmentsWorkspaceData {
  kpis: {
    todayCount: number;
    upcomingCount: number;
    pendingCount: number;
    completedCount: number;
    cancelledCount: number;
  };
  appointments: CalendarAppointmentItem[];
}

/**
 * Retrieves all appointments for a shop formatted for the calendar workspace.
 */
export async function getShopAppointmentsData(shopId: string): Promise<AppointmentsWorkspaceData> {
  try {
    const rawAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.shopId, shopId))
      .orderBy(appointments.visitTime);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    let todayCount = 0;
    let upcomingCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    const formattedAppointments: CalendarAppointmentItem[] = rawAppointments.map((app) => {
      const timeDate = new Date(app.visitTime);
      const dateKey = timeDate.toISOString().split("T")[0];
      const formattedTime = timeDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      if (dateKey === todayStr) {
        todayCount++;
      }

      if (timeDate > now && (app.status === "PENDING" || app.status === "CONFIRMED")) {
        upcomingCount++;
      }

      if (app.status === "PENDING") pendingCount++;
      else if (app.status === "COMPLETED") completedCount++;
      else if (app.status === "CANCELLED") cancelledCount++;

      return {
        id: app.id,
        customerName: app.customerName,
        customerPhone: app.customerPhone,
        visitTime: formattedTime,
        rawVisitTime: app.visitTime ? new Date(app.visitTime).toISOString() : new Date().toISOString(),
        dateKey,
        purposeOfVisit: app.purposeOfVisit,
        status: app.status as any,
        notes: app.additionalNotes,
      };
    });

    return {
      kpis: {
        todayCount,
        upcomingCount,
        pendingCount,
        completedCount,
        cancelledCount,
      },
      appointments: formattedAppointments,
    };
  } catch (error) {
    console.error("[getShopAppointmentsData] error:", error);
    return {
      kpis: {
        todayCount: 0,
        upcomingCount: 0,
        pendingCount: 0,
        completedCount: 0,
        cancelledCount: 0,
      },
      appointments: [],
    };
  }
}



