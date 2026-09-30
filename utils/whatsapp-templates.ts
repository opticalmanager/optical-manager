/**
 * Optical Manager — WhatsApp Utility Message Templates & Industrial Copy
 * Centralized repository for all optical retail customer notifications.
 * Adheres to Indian optical retail industry standards (Lenskart / Titan Eye+).
 */

export interface WhatsAppTemplateDefinition {
  id: string;
  label: string;
  category: "Billing" | "Clinical" | "Operations" | "Collections";
  description: string;
  enabled: boolean;
  template: string;
  availableVariables: string[];
}

export const DEFAULT_WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplateDefinition> = {
  order_form_sent: {
    id: "order_form_sent",
    label: "Order Booking Confirmation (Order Form)",
    category: "Operations",
    description: "Sent immediately when an optical order is placed with booking receipt & prescription details.",
    enabled: true,
    availableVariables: [
      "customer_name",
      "shop_name",
      "phone",
      "receipt_number",
      "order_number",
      "amount_paid",
      "balance_due",
      "estimated_delivery",
      "order_form_url",
    ],
    template: `Dear {{customer_name}},

Thank you for placing your optical order with *{{shop_name}}*! 👓

*📋 Order Booking Details:*
• Order Form #: *{{receipt_number}}*
• Advance Paid: *{{amount_paid}}*
• Remaining Balance: *{{balance_due}}*
• Est. Ready Date: *{{estimated_delivery}}*

*👁️ View Digital Order Form & Prescription:*
{{order_form_url}}

Your lenses are being crafted to clinical precision. For any inquiries, feel free to call or WhatsApp us at {{phone}}.

Warm regards,
*{{shop_name}}*`,
  },

  invoice_sent: {
    id: "invoice_sent",
    label: "GST Tax Invoice Dispatch",
    category: "Billing",
    description: "Dispatched upon billing with official GST tax invoice and digital PDF bill link.",
    enabled: true,
    availableVariables: [
      "customer_name",
      "shop_name",
      "phone",
      "invoice_number",
      "amount",
      "amount_paid",
      "balance_due",
      "payment_method",
      "invoice_url",
    ],
    template: `Dear {{customer_name}},

Thank you for choosing *{{shop_name}}*! Your official Tax Invoice is ready. 🧾

*🧾 Invoice Summary:*
• Invoice #: *{{invoice_number}}*
• Total Bill: *{{amount}}*
• Amount Paid: *{{amount_paid}}*
• Balance Due: *{{balance_due}}*
• Payment Mode: *{{payment_method}}*

*📥 View & Download Digital PDF Bill:*
{{invoice_url}}

Thank you for trusting us with your eyecare! We look forward to serving you again. For queries, contact us at {{phone}}.

Warm regards,
*{{shop_name}}*`,
  },

  prescription_sent: {
    id: "prescription_sent",
    label: "Clinical Eye Prescription (OD/OS)",
    category: "Clinical",
    description: "Sends patient's clinical refraction test records, diopter powers, and doctor attribution.",
    enabled: true,
    availableVariables: [
      "customer_name",
      "shop_name",
      "phone",
      "re_sph",
      "re_cyl",
      "re_axis",
      "re_add",
      "le_sph",
      "le_cyl",
      "le_axis",
      "le_add",
      "pd",
      "doctor_name",
      "invoice_url",
    ],
    template: `Dear {{customer_name}},

Here are your clinical eye refraction details from *{{shop_name}}* 👁️✨

*Right Eye (OD):*
• SPH: *{{re_sph}}* | CYL: *{{re_cyl}}* | AXIS: *{{re_axis}}* | ADD: *{{re_add}}*

*Left Eye (OS):*
• SPH: *{{le_sph}}* | CYL: *{{le_cyl}}* | AXIS: *{{le_axis}}* | ADD: *{{le_add}}*

• Pupillary Distance (P.D.): *{{pd}} mm*
• Prescribed By: *{{doctor_name}}*

*📄 View Digital Clinical Card & Records:*
{{invoice_url}}

Always protect your eyes with periodic check-ups! For consultation appointments, reach us at {{phone}}.

Warm regards,
*{{shop_name}}*`,
  },

  order_complete: {
    id: "order_complete",
    label: "Ready for In-Store Pickup",
    category: "Operations",
    description: "Notifies customer that their spectacles/lenses are edged, sanitized, and ready for collection.",
    enabled: true,
    availableVariables: [
      "customer_name",
      "shop_name",
      "order_number",
      "balance_due",
      "phone",
      "shop_address",
    ],
    template: `Hello {{customer_name}},

Great news! Your eyewear order (*{{order_number}}*) is fitted, sanitized, and *Ready for Pickup* at *{{shop_name}}*! 🎉👓

*📍 Store Address:*
{{shop_address}}

• Remaining Balance: *{{balance_due}}*
• Store Helpline: *{{phone}}*

Please visit us at your convenience for complimentary frame fitting and custom alignment. See you soon!

Warm regards,
*{{shop_name}}*`,
  },

  payment_reminder: {
    id: "payment_reminder",
    label: "Pending Dues / Balance Reminder",
    category: "Collections",
    description: "Polite payment notification sent to customers with outstanding dues.",
    enabled: true,
    availableVariables: [
      "customer_name",
      "shop_name",
      "order_number",
      "invoice_number",
      "amount",
      "amount_paid",
      "balance_due",
      "phone",
      "invoice_url",
    ],
    template: `Dear {{customer_name}},

This is a gentle payment reminder from *{{shop_name}}* regarding your order *{{order_number}}*. 💳

*💰 Account Statement:*
• Total Amount: *{{amount}}*
• Amount Paid: *{{amount_paid}}*
• *Pending Balance: {{balance_due}}*

*📄 View Digital Invoice & Summary:*
{{invoice_url}}

For payment options or assistance, please reach out to us at {{phone}}. Thank you for your continued patronship!

Warm regards,
*{{shop_name}}*`,
  },

  delivery_sent: {
    id: "delivery_sent",
    label: "Order In-Progress (Lab Edging)",
    category: "Operations",
    description: "Updates customer that their lenses are in the lab being surfaced, coated, and edged.",
    enabled: false,
    availableVariables: [
      "customer_name",
      "shop_name",
      "order_number",
      "estimated_delivery",
      "phone",
    ],
    template: `Hello {{customer_name}},

Your optical order (*{{order_number}}*) at *{{shop_name}}* is currently undergoing precision edging and lens coating in our lab. 🔬👓

• Expected Completion Date: *{{estimated_delivery}}*

We will notify you the moment your eyewear passes final quality inspection. Contact us at {{phone}} for updates.

Warm regards,
*{{shop_name}}*`,
  },

  delivery_delay: {
    id: "delivery_delay",
    label: "Quality Check Reschedule",
    category: "Operations",
    description: "Polite reschedule alert when custom coating or precision quality testing requires extra time.",
    enabled: false,
    availableVariables: [
      "customer_name",
      "shop_name",
      "order_number",
      "estimated_delivery",
      "phone",
    ],
    template: `Dear {{customer_name}},

Regarding your optical order (*{{order_number}}*) at *{{shop_name}}*:

To ensure your lenses meet our strict optical clarity and anti-scratch standards, your eyewear is undergoing an additional quality pass. 🔍

• *Revised Ready Date:* *{{estimated_delivery}}*

We sincerely apologize for this slight delay and appreciate your patience as we ensure perfect vision for you. Contact us directly at {{phone}} if you have questions.

Warm regards,
*{{shop_name}}*`,
  },
};

/**
 * Resolves the effective template text for a key, falling back to the industrial default
 */
export function getWhatsAppTemplateText(
  key: string,
  customTemplates?: Record<string, any>
): string {
  const custom = customTemplates?.[key];
  if (custom && typeof custom.template === "string" && custom.template.trim().length > 0) {
    return custom.template;
  }
  return DEFAULT_WHATSAPP_TEMPLATES[key]?.template || DEFAULT_WHATSAPP_TEMPLATES.invoice_sent.template;
}
