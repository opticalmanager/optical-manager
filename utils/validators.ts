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
  id: z.string().uuid("Invalid patient ID.").optional(),
  fullName: z.string().min(2, "Name is required.").max(255).trim(),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 digits.")
    .max(20)
    .trim(),
  dateOfBirth: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().or(z.literal("")),
  bloodGroup: z.enum([
    "A_POSITIVE",
    "A_NEGATIVE",
    "B_POSITIVE",
    "B_NEGATIVE",
    "AB_POSITIVE",
    "AB_NEGATIVE",
    "O_POSITIVE",
    "O_NEGATIVE",
  ]).optional().or(z.literal("")),
  referredBy: z.string().optional().or(z.literal("")),
  chiefComplaint: z.string().optional().or(z.literal("")),
  familyHistory: z.string().optional().or(z.literal("")),
  systemicIllness: z.string().optional().or(z.literal("")),
  allergies: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
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

export const prescriptionRowSchema = z.object({
  rightSphere: z.string().optional().or(z.literal("")),
  rightCylinder: z.string().optional().or(z.literal("")),
  rightAxis: z.string().optional().or(z.literal("")),
  rightAdd: z.string().optional().or(z.literal("")),
  rightNv: z.string().optional().or(z.literal("")),

  leftSphere: z.string().optional().or(z.literal("")),
  leftCylinder: z.string().optional().or(z.literal("")),
  leftAxis: z.string().optional().or(z.literal("")),
  leftAdd: z.string().optional().or(z.literal("")),
  leftNv: z.string().optional().or(z.literal("")),

  pdRight: z.string().optional().or(z.literal("")),
  pdLeft: z.string().optional().or(z.literal("")),
  pd: z.string().optional().or(z.literal("")),
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

export const frameItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().or(z.literal("")),
  rackLocation: z.string().optional().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().or(z.literal("")),
  inwardDate: z.string().optional().or(z.literal("")),
  
  quantity: z.coerce.number().int().min(0, "Initial unit count cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  
  imageUrl: z.string().optional().or(z.literal("")),
  
  modelNumber: z.string().optional().or(z.literal("")),
  colorCode: z.string().optional().or(z.literal("")),
  size: z.string().optional().or(z.literal("")),
  material: z.string().optional().or(z.literal("")),
  frameShape: z.string().optional().or(z.literal("")),
  targetDemographic: z.string().optional().or(z.literal("")),
});

export const editFrameItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().or(z.literal("")),
  rackLocation: z.string().optional().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().or(z.literal("")),
  inwardDate: z.string().optional().or(z.literal("")),
  
  // Expiry controls
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  
  // Stock Refill controls
  addStockQuantity: z.coerce.number().int().min(0, "Added units cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  
  imageUrl: z.string().optional().or(z.literal("")),
  
  modelNumber: z.string().optional().or(z.literal("")),
  colorCode: z.string().optional().or(z.literal("")),
  size: z.string().optional().or(z.literal("")),
  material: z.string().optional().or(z.literal("")),
  frameShape: z.string().optional().or(z.literal("")),
  targetDemographic: z.string().optional().or(z.literal("")),
});

export const lensItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().or(z.literal("")),
  rackLocation: z.string().optional().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().or(z.literal("")),
  inwardDate: z.string().optional().or(z.literal("")),
  
  quantity: z.coerce.number().int().min(0, "Initial unit count cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  
  imageUrl: z.string().optional().or(z.literal("")),
  
  // Lens specific parameters
  design: z.string().optional().or(z.literal("")),
  refractiveIndex: z.string().optional().or(z.literal("")),
  material: z.string().optional().or(z.literal("")),
  blankDiameter: z.coerce.number().int().min(0).default(65),
  stockPower: z.string().optional().or(z.literal("")),
  
  // Coatings & Enhancements (Checkboxes)
  isUncoated: z.boolean().default(false),
  isAntiReflective: z.boolean().default(false),
  isBlueControl: z.boolean().default(false),
  isTinted: z.boolean().default(false),
  isPolarized: z.boolean().default(false),
  isHardCoat: z.boolean().default(false),
  isPhotochromic: z.boolean().default(false),
});

export const editLensItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().or(z.literal("")),
  rackLocation: z.string().optional().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().or(z.literal("")),
  inwardDate: z.string().optional().or(z.literal("")),
  
  // Expiry controls
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  
  // Stock Refill controls
  addStockQuantity: z.coerce.number().int().min(0, "Added units cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  
  imageUrl: z.string().optional().or(z.literal("")),
  
  // Lens specific parameters
  design: z.string().optional().or(z.literal("")),
  refractiveIndex: z.string().optional().or(z.literal("")),
  material: z.string().optional().or(z.literal("")),
  blankDiameter: z.coerce.number().int().min(0).default(65),
  stockPower: z.string().optional().or(z.literal("")),
  
  // Coatings & Enhancements (Checkboxes)
  isUncoated: z.boolean().default(false),
  isAntiReflective: z.boolean().default(false),
  isBlueControl: z.boolean().default(false),
  isTinted: z.boolean().default(false),
  isPolarized: z.boolean().default(false),
  isHardCoat: z.boolean().default(false),
  isPhotochromic: z.boolean().default(false),
});

export const contactLensItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().or(z.literal("")),
  rackLocation: z.string().optional().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().or(z.literal("")),
  inwardDate: z.string().optional().or(z.literal("")),
  
  quantity: z.coerce.number().int().min(0, "Initial unit count cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  
  imageUrl: z.string().optional().or(z.literal("")),
  
  // Contact lens specific
  modality: z.string().optional().or(z.literal("")),
  boxQuantity: z.coerce.number().int().min(0).default(30),
  baseCurve: z.string().optional().or(z.literal("")),
  diameter: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  sphere: z.string().optional().or(z.literal("")),
  cylinder: z.string().optional().or(z.literal("")),
  axis: z.string().optional().or(z.literal("")),
  addPower: z.string().optional().or(z.literal("")),
});

export const editContactLensItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().or(z.literal("")),
  rackLocation: z.string().optional().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().or(z.literal("")),
  inwardDate: z.string().optional().or(z.literal("")),
  
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  
  addStockQuantity: z.coerce.number().int().min(0, "Added units cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  
  imageUrl: z.string().optional().or(z.literal("")),
  
  modality: z.string().optional().or(z.literal("")),
  boxQuantity: z.coerce.number().int().min(0).default(30),
  baseCurve: z.string().optional().or(z.literal("")),
  diameter: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  sphere: z.string().optional().or(z.literal("")),
  cylinder: z.string().optional().or(z.literal("")),
  axis: z.string().optional().or(z.literal("")),
  addPower: z.string().optional().or(z.literal("")),
});

export const accessoryItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().or(z.literal("")),
  rackLocation: z.string().optional().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().or(z.literal("")),
  inwardDate: z.string().optional().or(z.literal("")),
  
  quantity: z.coerce.number().int().min(0, "Initial unit count cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  
  imageUrl: z.string().optional().or(z.literal("")),
  
  type: z.string().min(1, "Accessory type is required."),
  sizeVolume: z.string().optional().or(z.literal("")),
  colorPattern: z.string().optional().or(z.literal("")),
});

export const editAccessoryItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().or(z.literal("")),
  rackLocation: z.string().optional().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().or(z.literal("")),
  inwardDate: z.string().optional().or(z.literal("")),
  
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  
  addStockQuantity: z.coerce.number().int().min(0, "Added units cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  
  imageUrl: z.string().optional().or(z.literal("")),
  
  type: z.string().min(1, "Accessory type is required."),
  sizeVolume: z.string().optional().or(z.literal("")),
  colorPattern: z.string().optional().or(z.literal("")),
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

export const invoiceItemSchema = z.object({
  inventoryId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Product description is required."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative."),
  subtotal: z.coerce.number().min(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  cgstAmount: z.coerce.number().min(0).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstAmount: z.coerce.number().min(0).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  igstAmount: z.coerce.number().min(0).default(0),
});

export const patientVisitSchema = z.object({
  customer: customerSchema,
  prescriptionEnabled: z.boolean().default(false),
  prescriptionType: z.object({
    distance: z.boolean().default(false),
    near: z.boolean().default(false),
  }),
  distancePrescription: prescriptionRowSchema.optional(),
  nearPrescription: prescriptionRowSchema.optional(),
  doctorName: z.string().optional().or(z.literal("")),
  partyName: z.string().optional().or(z.literal("")),
  frameName: z.string().optional().or(z.literal("")),
  estimatedDelivery: z.string().optional().or(z.literal("")),
  specialInstructions: z.string().optional().or(z.literal("")),
  prescriptionNotes: z.string().optional().or(z.literal("")),
  invoiceEnabled: z.boolean().default(false),
  invoiceItems: z.array(invoiceItemSchema).optional(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"]).default("CASH"),
  amountPaid: z.coerce.number().min(0).default(0),
  balanceDue: z.coerce.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")),
  deliveryDays: z.coerce.number().min(0).default(0),
});

// --- Form State Type ---

export type FormState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
} | undefined;

