import { db } from "@/lib/drizzle";
import { organizations, shops } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ModuleCustomizationItem {
  id: string;
  name: string;
  description: string;
  category: "fields" | "display" | "workflow" | "printing";
  enabled: boolean;
  required?: boolean;
  defaultValue?: string | number | boolean;
  type: "toggle" | "select" | "text" | "number" | "multiselect";
  options?: string[];
  scope: "all" | "shop_only" | "org_only";
}

export interface ModuleConfig {
  id: string;
  title: string;
  subtitle: string;
  items: ModuleCustomizationItem[];
}

export interface CustomizationConfig {
  dashboard: ModuleConfig;
  inventory: ModuleConfig;
  sales: ModuleConfig;
  invoices: ModuleConfig;
  vendors: ModuleConfig;
  customers: ModuleConfig;
  appointments: ModuleConfig;
  reports: ModuleConfig;
}

export const DEFAULT_CUSTOMIZATION_CONFIG: CustomizationConfig = {
  dashboard: {
    id: "dashboard",
    title: "Dashboard Customization",
    subtitle: "Configure overview metrics, KPI cards, visual charts, and default analytics timeframes.",
    items: [
      {
        id: "kpi_revenue_growth",
        name: "Revenue Growth Card",
        description: "Display total revenue and period-over-period percentage growth.",
        category: "display",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "kpi_orders_count",
        name: "Total Orders Metric",
        description: "Show total order volume count in the KPI summary bar.",
        category: "display",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "kpi_pending_dues",
        name: "Outstanding Dues Counter",
        description: "Display accumulated unpaid customer dues on the main screen.",
        category: "display",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "kpi_stock_alerts",
        name: "Critical Low Stock Alerts",
        description: "Show high-priority red alert pill when SKUs cross minimum reorder level.",
        category: "display",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "default_timeframe",
        name: "Default Dashboard Timeframe",
        description: "Initial time window loaded when opening the store dashboard.",
        category: "workflow",
        enabled: true,
        defaultValue: "MONTH",
        type: "select",
        options: ["TODAY", "WEEK", "MONTH", "YEAR"],
        scope: "all",
      },
      {
        id: "quick_action_new_invoice",
        name: "Quick Action: + New Invoice",
        description: "Show prominent 1-click POS invoice creation button in header bar.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "quick_action_add_patient",
        name: "Quick Action: + Add Patient",
        description: "Display top-level quick patient onboarding shortcut.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
    ],
  },
  inventory: {
    id: "inventory",
    title: "Inventory & Catalog Customization",
    subtitle: "Tailor product catalog fields, barcode scanning preferences, low-stock thresholds, and brand categorizations.",
    items: [
      {
        id: "field_barcode_scanner",
        name: "Barcode / QR Scanner Field",
        description: "Enable dedicated camera / hardware barcode lookup field in product forms.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "field_hsn_code",
        name: "HSN / SAC Code Column",
        description: "Show HSN code in inventory tables and product detail modals.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "field_frame_dimensions",
        name: "Frame Eye / Bridge / Temple Size",
        description: "Display structural millimeter dimensions (e.g. 52-18-140) on frames.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "field_lens_index",
        name: "Lens Refractive Index",
        description: "Track refractive index ratings (1.56, 1.61, 1.67, 1.74) for ophthalmic lenses.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "low_stock_global_threshold",
        name: "Default Low-Stock Threshold",
        description: "Default minimum quantity before triggering low-inventory alerts across shops.",
        category: "workflow",
        enabled: true,
        defaultValue: 5,
        type: "number",
        scope: "all",
      },
      {
        id: "auto_generate_sku",
        name: "Auto-Generate Sequential SKU",
        description: "Automatically formulate SKU codes from category, brand, and sequence numbers.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "allow_negative_stock",
        name: "Allow Negative Stock Invoicing",
        description: "Permit billing items when physical on-hand stock is temporarily zero.",
        category: "workflow",
        enabled: false,
        type: "toggle",
        scope: "all",
      },
    ],
  },
  sales: {
    id: "sales",
    title: "Sales & Orders Customization",
    subtitle: "Customize checkout workflow steps, fulfillment statuses, sales counter fields, and order routing.",
    items: [
      {
        id: "field_salesperson_tag",
        name: "Assigned Salesperson / Staff Tag",
        description: "Prompt for staff member / salesperson attribution during checkout.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "field_order_notes",
        name: "Internal Workshop Notes",
        description: "Allow lab technicians and fitting staff to attach private workshop notes.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "workflow_enable_fitting_stage",
        name: "Optical Lab Fitting Stage",
        description: "Include 'IN FITTING / LAB' step in order lifecycle before final delivery.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "workflow_require_advance_payment",
        name: "Require Minimum Advance Deposit",
        description: "Enforce a minimum percentage deposit before booking custom prescription orders.",
        category: "workflow",
        enabled: false,
        defaultValue: 30,
        type: "number",
        scope: "all",
      },
      {
        id: "display_order_delivery_countdown",
        name: "Expected Delivery Date Badge",
        description: "Highlight estimated delivery dates and overdue alerts on active orders.",
        category: "display",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
    ],
  },
  invoices: {
    id: "invoices",
    title: "Invoices & Billing Customization",
    subtitle: "Configure invoice layout, GST breakdown columns, thermal vs A4 templates, and legal terms.",
    items: [
      {
        id: "print_show_bank_qr",
        name: "Dynamic UPI Payment QR Code",
        description: "Embed instant payment UPI QR code on printed A4 and thermal invoices.",
        category: "printing",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "print_show_doctor_signature",
        name: "Optometrist / Doctor Signature Box",
        description: "Include dedicated clinical refractionist sign-off block on invoices.",
        category: "printing",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "print_show_gst_breakdown",
        name: "Itemized CGST / SGST / IGST Table",
        description: "Show explicit column-by-column tax breakdown on customer invoice copies.",
        category: "printing",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "print_terms_and_conditions",
        name: "Warranty & Return Terms Footer",
        description: "Display store policy, guarantee period, and return rules at invoice footer.",
        category: "printing",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "invoice_allow_custom_date",
        name: "Allow Backdated / Advance Billing",
        description: "Permit authorized staff to adjust invoice date/time when entering historical records.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
    ],
  },
  vendors: {
    id: "vendors",
    title: "Vendors & Purchases Customization",
    subtitle: "Manage supplier profile fields, purchase order numbering formats, and vendor expense tracking.",
    items: [
      {
        id: "vendor_field_gstin",
        name: "Vendor GSTIN Validation",
        description: "Require and validate 15-digit GSTIN on supplier purchase invoices.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "vendor_po_prefix",
        name: "Purchase Order Prefix",
        description: "Default prefix code for outgoing purchase orders (e.g. 'PO-2026-').",
        category: "workflow",
        enabled: true,
        defaultValue: "PO-",
        type: "text",
        scope: "all",
      },
      {
        id: "vendor_auto_stock_inward",
        name: "Instant Stock Inwarding",
        description: "Automatically increase inventory counts the moment a purchase invoice is marked received.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "vendor_track_payment_due_dates",
        name: "Vendor Payment Due Reminders",
        description: "Track credit terms (e.g. Net 30/60) and display upcoming supplier balance dues.",
        category: "display",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
    ],
  },
  customers: {
    id: "customers",
    title: "Customers & Clinical Customization",
    subtitle: "Configure patient onboarding fields, eye refraction matrix parameters, and clinical history tracking.",
    items: [
      {
        id: "field_pupillary_distance",
        name: "Pupillary Distance (PD / Monocular PD)",
        description: "Include individual Right / Left PD fields in refraction prescription cards.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "field_cylinder_axis_precision",
        name: "Axis & Cylinder Fractional Steps",
        description: "Support 0.25D cylinder steps and precise 1-degree axis alignment.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "field_medical_history_tags",
        name: "Systemic Illness & Allergy Flags",
        description: "Show quick medical history tags (Diabetes, Hypertension, Dry Eyes) in patient card.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "require_mobile_number",
        name: "Enforce 10-Digit Mobile Number",
        description: "Require a valid 10-digit mobile number before registering a patient profile.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "clinical_auto_fill_doctor",
        name: "Auto-Fill Default Examining Doctor",
        description: "Pre-populate the logged-in optometrist / clinician name on new eye tests.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
    ],
  },
  appointments: {
    id: "appointments",
    title: "Appointments & Reminders Customization",
    subtitle: "Set up appointment slots, eye exam booking categories, automated reminders, and calendar preferences.",
    items: [
      {
        id: "default_slot_duration",
        name: "Default Consultation Slot Duration",
        description: "Duration allocated per eye checkup booking.",
        category: "workflow",
        enabled: true,
        defaultValue: 30,
        type: "select",
        options: ["15 min", "30 min", "45 min", "60 min"],
        scope: "all",
      },
      {
        id: "auto_send_booking_sms",
        name: "Automated SMS / WhatsApp Confirmation",
        description: "Send instant confirmation message with appointment time upon booking.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "display_upcoming_calendar_widget",
        name: "Daily Appointment Strip on Counter",
        description: "Show a compact top banner with today's scheduled eye tests on the sales desk.",
        category: "display",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
    ],
  },
  reports: {
    id: "reports",
    title: "Reports & Analytics Customization",
    subtitle: "Customize sales summary aggregations, GST filing exports, stock valuation columns, and automated digests.",
    items: [
      {
        id: "report_include_tax_breakdown",
        name: "Detailed GST Filing Columns",
        description: "Export GSTR-1 matching columns (Taxable Value, CGST, SGST, IGST) in CSV/Excel.",
        category: "fields",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "report_daily_closing_summary",
        name: "Daily Cash & UPI Drawer Reconciler",
        description: "Generate end-of-day register closing report comparing cash drawer with system totals.",
        category: "workflow",
        enabled: true,
        type: "toggle",
        scope: "all",
      },
      {
        id: "report_export_formats",
        name: "Enabled Export Formats",
        description: "File types permitted for downloading accounting and inventory audit logs.",
        category: "printing",
        enabled: true,
        defaultValue: "CSV & PDF",
        type: "select",
        options: ["CSV Only", "PDF Only", "CSV & PDF", "Excel (.xlsx)"],
        scope: "all",
      },
    ],
  },
};

/**
 * Retrieve customization settings with organization defaults and optional shop-level overrides.
 */
export async function getCustomizationSettings(
  organizationId: string,
  shopId?: string | null
): Promise<CustomizationConfig> {
  const [org] = await db
    .select({
      id: organizations.id,
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const orgCustomization = ((org?.settings as any)?.customization as Partial<CustomizationConfig>) || {};

  let shopCustomization: Partial<CustomizationConfig> = {};
  if (shopId) {
    const [shop] = await db
      .select({
        id: shops.id,
        settings: shops.settings,
      })
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    shopCustomization = ((shop?.settings as any)?.customization as Partial<CustomizationConfig>) || {};
  }

  // Deep merge default config with org config and shop overrides
  const merged: CustomizationConfig = JSON.parse(JSON.stringify(DEFAULT_CUSTOMIZATION_CONFIG));

  (Object.keys(merged) as Array<keyof CustomizationConfig>).forEach((moduleKey) => {
    const defaultModule = merged[moduleKey];
    const orgModule = orgCustomization[moduleKey];
    const shopModule = shopCustomization[moduleKey];

    if (orgModule && Array.isArray(orgModule.items)) {
      orgModule.items.forEach((orgItem) => {
        const target = defaultModule.items.find((i) => i.id === orgItem.id);
        if (target) {
          if (typeof orgItem.enabled === "boolean") target.enabled = orgItem.enabled;
          if (orgItem.defaultValue !== undefined) target.defaultValue = orgItem.defaultValue;
        }
      });
    }

    if (shopModule && Array.isArray(shopModule.items)) {
      shopModule.items.forEach((shopItem) => {
        const target = defaultModule.items.find((i) => i.id === shopItem.id);
        if (target) {
          if (typeof shopItem.enabled === "boolean") target.enabled = shopItem.enabled;
          if (shopItem.defaultValue !== undefined) target.defaultValue = shopItem.defaultValue;
        }
      });
    }
  });

  return merged;
}

/**
 * Update customization settings at Organization or Shop level.
 */
export async function updateCustomizationSettings(
  organizationId: string,
  shopId: string | null | undefined,
  config: Partial<CustomizationConfig>
): Promise<{ success: boolean; message: string }> {
  try {
    if (shopId) {
      // Update Shop-level customization override
      const [shop] = await db
        .select({ id: shops.id, settings: shops.settings })
        .from(shops)
        .where(eq(shops.id, shopId))
        .limit(1);

      if (!shop) {
        return { success: false, message: "Shop not found." };
      }

      const currentSettings = (shop.settings as Record<string, any>) || {};
      const updatedSettings = {
        ...currentSettings,
        customization: config,
      };

      await db
        .update(shops)
        .set({
          settings: updatedSettings as any,
          updatedAt: new Date(),
        })
        .where(eq(shops.id, shopId));

      return { success: true, message: "Shop customization overrides saved successfully!" };
    } else {
      // Update Organization-wide default customization
      const [org] = await db
        .select({ id: organizations.id, settings: organizations.settings })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org) {
        return { success: false, message: "Organization not found." };
      }

      const currentSettings = (org.settings as Record<string, any>) || {};
      const updatedSettings = {
        ...currentSettings,
        customization: config,
      };

      await db
        .update(organizations)
        .set({
          settings: updatedSettings as any,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));

      return { success: true, message: "Organization customization settings saved successfully!" };
    }
  } catch (error: any) {
    console.error("Failed to update customization settings:", error);
    return { success: false, message: error?.message || "Database update failed." };
  }
}
