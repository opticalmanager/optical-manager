import * as z from "zod";

/**
 * Zod validation schemas for forms and server actions.
 */

// --- Auth Schemas ---

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(255)
    .trim(),
  email: z.string().email("Please enter a valid email address.").trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  organizationName: z
    .string()
    .min(2, "Organization name must be at least 2 characters.")
    .max(255)
    .trim(),
});

// --- Shop Schemas ---

export const createShopSchema = z.object({
  name: z
    .string()
    .min(2, "Shop name must be at least 2 characters.")
    .max(255)
    .trim(),
  address: z.string().optional(),
  phone: z
    .string()
    .regex(/^[+]?[\d\s()-]{7,20}$/, "Please enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal("")),
});

// --- Shop Manager Schemas ---

export const createShopManagerSchema = z.object({
  fullName: z.string().min(2).max(255).trim(),
  email: z.string().email().trim(),
  password: z.string().min(8),
  shopId: z.string().uuid("Please select a shop."),
});

// --- Customer Schemas ---

export const customerSchema = z.object({
  fullName: z.string().min(2, "Name is required.").max(255).trim(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z
    .string()
    .min(7, "Phone number is required.")
    .max(20)
    .trim(),
  dateOfBirth: z.string().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// --- Prescription Schemas ---

export const prescriptionSchema = z.object({
  customerId: z.string().uuid("Please select a customer."),
  rightSphere: z.string().optional().or(z.literal("")),
  rightCylinder: z.string().optional().or(z.literal("")),
  rightAxis: z.string().optional().or(z.literal("")),
  rightAdd: z.string().optional().or(z.literal("")),
  leftSphere: z.string().optional().or(z.literal("")),
  leftCylinder: z.string().optional().or(z.literal("")),
  leftAxis: z.string().optional().or(z.literal("")),
  leftAdd: z.string().optional().or(z.literal("")),
  pd: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
  prescribedBy: z.string().optional(),
  prescribedAt: z.string().optional(),
});

// --- Inventory Schemas ---

export const inventorySchema = z.object({
  name: z.string().min(2, "Product name is required.").max(255).trim(),
  category: z.enum(["FRAME", "LENS", "CONTACT_LENS", "ACCESSORY", "SOLUTION"]),
  brand: z.string().optional().or(z.literal("")),
  model: z.string().optional().or(z.literal("")),
  sku: z.string().optional().or(z.literal("")),
  price: z.string().min(1, "Price is required."),
  costPrice: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative."),
  minQuantity: z.coerce.number().int().min(0).default(5),
});

// --- Invoice Schemas ---

export const invoiceSchema = z.object({
  customerId: z.string().uuid("Please select a customer."),
  subtotal: z.string().min(1, "Subtotal is required."),
  discount: z.string().optional().default("0"),
  tax: z.string().optional().default("0"),
  total: z.string().min(1, "Total is required."),
  status: z.enum(["DRAFT", "PENDING", "PAID", "CANCELLED"]).default("DRAFT"),
  paymentMethod: z
    .enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"])
    .optional(),
  notes: z.string().optional(),
});

// --- Form State Type ---

export type FormState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
} | undefined;
