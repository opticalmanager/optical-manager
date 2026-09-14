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

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address.").trim(),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

// --- Shop Schemas ---

export const createShopSchema = z.object({
  name: z
    .string()
    .min(2, "Shop name must be at least 2 characters.")
    .max(255)
    .trim(),
  address: z.string().optional().nullable().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^(\+91)?0?[6-9]\d{9}$|^[0-9]{10}$/, "Please enter a valid 10-digit mobile number.")
        .or(z.literal(""))
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal(""))
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email.",
    }),
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
  id: z.string().optional().nullable().or(z.literal("")),
  fullName: z.string().min(2, "Name is required.").max(255).trim(),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal(""))
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Invalid email address.",
    }),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^(\+91)?0?[6-9]\d{9}$|^[0-9]{10}$/, "Please enter a valid 10-digit mobile number.")
    ),
  dateOfBirth: z.string().optional().nullable().or(z.literal("")),
  age: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
  city: z.string().optional().nullable().or(z.literal("")),
  state: z.string().optional().nullable().or(z.literal("")),
  pincode: z.string().optional().nullable().or(z.literal("")),
  gender: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
      z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable().or(z.literal(""))
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  bloodGroup: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
      z.enum([
        "A_POSITIVE",
        "A_NEGATIVE",
        "B_POSITIVE",
        "B_NEGATIVE",
        "AB_POSITIVE",
        "AB_NEGATIVE",
        "O_POSITIVE",
        "O_NEGATIVE",
      ]).optional().nullable().or(z.literal(""))
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  referredBy: z.string().optional().nullable().or(z.literal("")),
  chiefComplaint: z.string().optional().nullable().or(z.literal("")),
  familyHistory: z.string().optional().nullable().or(z.literal("")),
  systemicIllness: z.string().optional().nullable().or(z.literal("")),
  allergies: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable().or(z.literal("")),
});

// --- Prescription Schemas ---

export const prescriptionSchema = z.object({
  customerId: z.string().min(1, "Please select a customer."),
  rightSphere: z.string().optional().nullable().or(z.literal("")),
  rightCylinder: z.string().optional().nullable().or(z.literal("")),
  rightAxis: z.string().optional().nullable().or(z.literal("")),
  rightAdd: z.string().optional().nullable().or(z.literal("")),
  leftSphere: z.string().optional().nullable().or(z.literal("")),
  leftCylinder: z.string().optional().nullable().or(z.literal("")),
  leftAxis: z.string().optional().nullable().or(z.literal("")),
  leftAdd: z.string().optional().nullable().or(z.literal("")),
  caddRight: z.string().optional().nullable().or(z.literal("")),
  caddLeft: z.string().optional().nullable().or(z.literal("")),
  pdRight: z.string().optional().nullable().or(z.literal("")),
  pdLeft: z.string().optional().nullable().or(z.literal("")),
  pd: z.string().optional().nullable().or(z.literal("")),
  lensType: z.string().optional().nullable().or(z.literal("")),
  rxNumber: z.string().optional().nullable().or(z.literal("")),
  rxCategory: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable().or(z.literal("")),
  prescribedBy: z.string().optional().nullable().or(z.literal("")),
  prescribedAt: z.string().optional().nullable().or(z.literal("")),
});

export const prescriptionRowSchema = z.object({
  rightSphere: z.string().optional().nullable().or(z.literal("")),
  rightCylinder: z.string().optional().nullable().or(z.literal("")),
  rightAxis: z.string().optional().nullable().or(z.literal("")),
  rightAdd: z.string().optional().nullable().or(z.literal("")),
  rightNv: z.string().optional().nullable().or(z.literal("")),

  leftSphere: z.string().optional().nullable().or(z.literal("")),
  leftCylinder: z.string().optional().nullable().or(z.literal("")),
  leftAxis: z.string().optional().nullable().or(z.literal("")),
  leftAdd: z.string().optional().nullable().or(z.literal("")),
  leftNv: z.string().optional().nullable().or(z.literal("")),

  pdRight: z.string().optional().nullable().or(z.literal("")),
  pdLeft: z.string().optional().nullable().or(z.literal("")),
  pd: z.string().optional().nullable().or(z.literal("")),
  caddRight: z.string().optional().nullable().or(z.literal("")),
  caddLeft: z.string().optional().nullable().or(z.literal("")),
});

// --- Inventory Schemas ---

export const inventorySchema = z.object({
  name: z.string().min(2, "Product name is required.").max(255).trim(),
  category: z.enum(["FRAME", "LENS", "CONTACT_LENS", "ACCESSORY", "SOLUTION"]),
  brand: z.string().optional().nullable().or(z.literal("")),
  model: z.string().optional().nullable().or(z.literal("")),
  sku: z.string().optional().nullable().or(z.literal("")),
  price: z.string().min(1, "Price is required."),
  costPrice: z.string().optional().nullable().or(z.literal("")),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative."),
  minQuantity: z.coerce.number().int().min(0).default(5),
});

export const frameItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().nullable().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().nullable().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().nullable().or(z.literal("")),
  rackLocation: z.string().optional().nullable().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().nullable().or(z.literal("")),
  inwardDate: z.string().optional().nullable().or(z.literal("")),
  
  quantity: z.coerce.number().int().min(0, "Initial unit count cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().nullable().or(z.literal("")),
  expiryDate: z.string().optional().nullable().or(z.literal("")),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  modelNumber: z.string().optional().nullable().or(z.literal("")),
  colorCode: z.string().optional().nullable().or(z.literal("")),
  size: z.string().optional().nullable().or(z.literal("")),
  material: z.string().optional().nullable().or(z.literal("")),
  frameShape: z.string().optional().nullable().or(z.literal("")),
  targetDemographic: z.string().optional().nullable().or(z.literal("")),
});

export const editFrameItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().nullable().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().nullable().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().nullable().or(z.literal("")),
  rackLocation: z.string().optional().nullable().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().nullable().or(z.literal("")),
  inwardDate: z.string().optional().nullable().or(z.literal("")),
  
  // Expiry controls
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().nullable().or(z.literal("")),
  expiryDate: z.string().optional().nullable().or(z.literal("")),
  
  // Stock Refill controls
  addStockQuantity: z.coerce.number().int().min(0, "Added units cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  modelNumber: z.string().optional().nullable().or(z.literal("")),
  colorCode: z.string().optional().nullable().or(z.literal("")),
  size: z.string().optional().nullable().or(z.literal("")),
  material: z.string().optional().nullable().or(z.literal("")),
  frameShape: z.string().optional().nullable().or(z.literal("")),
  targetDemographic: z.string().optional().nullable().or(z.literal("")),
});

export const lensItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().nullable().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().nullable().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().nullable().or(z.literal("")),
  rackLocation: z.string().optional().nullable().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().nullable().or(z.literal("")),
  inwardDate: z.string().optional().nullable().or(z.literal("")),
  
  quantity: z.coerce.number().int().min(0, "Initial unit count cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().nullable().or(z.literal("")),
  expiryDate: z.string().optional().nullable().or(z.literal("")),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  // Lens specific parameters
  design: z.string().optional().nullable().or(z.literal("")),
  refractiveIndex: z.string().optional().nullable().or(z.literal("")),
  material: z.string().optional().nullable().or(z.literal("")),
  blankDiameter: z.coerce.number().int().min(0).default(65),
  stockPower: z.string().optional().nullable().or(z.literal("")),
  
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
  brand: z.string().optional().nullable().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().nullable().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().nullable().or(z.literal("")),
  rackLocation: z.string().optional().nullable().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().nullable().or(z.literal("")),
  inwardDate: z.string().optional().nullable().or(z.literal("")),
  
  // Expiry controls
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().nullable().or(z.literal("")),
  expiryDate: z.string().optional().nullable().or(z.literal("")),
  
  // Stock Refill controls
  addStockQuantity: z.coerce.number().int().min(0, "Added units cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  // Lens specific parameters
  design: z.string().optional().nullable().or(z.literal("")),
  refractiveIndex: z.string().optional().nullable().or(z.literal("")),
  material: z.string().optional().nullable().or(z.literal("")),
  blankDiameter: z.coerce.number().int().min(0).default(65),
  stockPower: z.string().optional().nullable().or(z.literal("")),
  
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
  brand: z.string().optional().nullable().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().nullable().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().nullable().or(z.literal("")),
  rackLocation: z.string().optional().nullable().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().nullable().or(z.literal("")),
  inwardDate: z.string().optional().nullable().or(z.literal("")),
  
  quantity: z.coerce.number().int().min(0, "Initial unit count cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().nullable().or(z.literal("")),
  expiryDate: z.string().optional().nullable().or(z.literal("")),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  // Contact lens specific
  modality: z.string().optional().nullable().or(z.literal("")),
  boxQuantity: z.coerce.number().int().min(0).default(30),
  baseCurve: z.string().optional().nullable().or(z.literal("")),
  diameter: z.string().optional().nullable().or(z.literal("")),
  color: z.string().optional().nullable().or(z.literal("")),
  sphere: z.string().optional().nullable().or(z.literal("")),
  cylinder: z.string().optional().nullable().or(z.literal("")),
  axis: z.string().optional().nullable().or(z.literal("")),
  addPower: z.string().optional().nullable().or(z.literal("")),
});

export const editContactLensItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().nullable().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().nullable().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().nullable().or(z.literal("")),
  rackLocation: z.string().optional().nullable().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().nullable().or(z.literal("")),
  inwardDate: z.string().optional().nullable().or(z.literal("")),
  
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().nullable().or(z.literal("")),
  expiryDate: z.string().optional().nullable().or(z.literal("")),
  
  addStockQuantity: z.coerce.number().int().min(0, "Added units cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  modality: z.string().optional().nullable().or(z.literal("")),
  boxQuantity: z.coerce.number().int().min(0).default(30),
  baseCurve: z.string().optional().nullable().or(z.literal("")),
  diameter: z.string().optional().nullable().or(z.literal("")),
  color: z.string().optional().nullable().or(z.literal("")),
  sphere: z.string().optional().nullable().or(z.literal("")),
  cylinder: z.string().optional().nullable().or(z.literal("")),
  axis: z.string().optional().nullable().or(z.literal("")),
  addPower: z.string().optional().nullable().or(z.literal("")),
});

export const accessoryItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().nullable().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().nullable().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().nullable().or(z.literal("")),
  rackLocation: z.string().optional().nullable().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().nullable().or(z.literal("")),
  inwardDate: z.string().optional().nullable().or(z.literal("")),
  
  quantity: z.coerce.number().int().min(0, "Initial unit count cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().nullable().or(z.literal("")),
  expiryDate: z.string().optional().nullable().or(z.literal("")),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  type: z.string().min(1, "Accessory type is required."),
  sizeVolume: z.string().optional().nullable().or(z.literal("")),
  colorPattern: z.string().optional().nullable().or(z.literal("")),
});

export const editAccessoryItemSchema = z.object({
  name: z.string().min(2, "Item name is required.").max(255).trim(),
  brand: z.string().optional().nullable().or(z.literal("")),
  
  costPrice: z.coerce.number().min(0, "Acquisition cost must be positive.").default(0),
  price: z.coerce.number().min(0.01, "Selling retail price is required."),
  hsnCode: z.string().optional().nullable().or(z.literal("")),
  cgstPercent: z.coerce.number().min(0).max(100).default(0),
  sgstPercent: z.coerce.number().min(0).max(100).default(0),
  igstPercent: z.coerce.number().min(0).max(100).default(0),
  vendorName: z.string().optional().nullable().or(z.literal("")),
  rackLocation: z.string().optional().nullable().or(z.literal("")),
  
  purchaseInvoiceNo: z.string().optional().nullable().or(z.literal("")),
  inwardDate: z.string().optional().nullable().or(z.literal("")),
  
  requiresExpiryTracking: z.boolean().default(false),
  batchNumber: z.string().optional().nullable().or(z.literal("")),
  expiryDate: z.string().optional().nullable().or(z.literal("")),
  
  addStockQuantity: z.coerce.number().int().min(0, "Added units cannot be negative.").default(0),
  minQuantity: z.coerce.number().int().min(0, "Low stock threshold cannot be negative.").default(5),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  type: z.string().min(1, "Accessory type is required."),
  sizeVolume: z.string().optional().nullable().or(z.literal("")),
  colorPattern: z.string().optional().nullable().or(z.literal("")),
});

// --- Invoice Schemas ---

export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Please select a customer."),
  invoiceDate: z.string().optional().or(z.literal("")),
  soldBy: z.string().optional().or(z.literal("")),
  subtotal: z.string().min(1, "Subtotal is required."),
  discount: z.preprocess((v) => (v === null || v === undefined ? "0" : String(v)), z.string()).default("0"),
  tax: z.preprocess((v) => (v === null || v === undefined ? "0" : String(v)), z.string()).default("0"),
  creditApplied: z.preprocess((v) => (v === null || v === undefined ? "0" : String(v)), z.string()).default("0"),
  total: z.string().min(1, "Total is required."),
  status: z.enum(["DRAFT", "PENDING", "PAID", "CANCELLED"]).default("DRAFT"),
  paymentMethod: z
    .enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"])
    .optional(),
  notes: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  inventoryId: z.string().optional().nullable().or(z.literal("")),
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
  invoiceDate: z.string().optional().nullable().or(z.literal("")),
  soldBy: z.string().optional().nullable().or(z.literal("")),
  prescriptionEnabled: z.boolean().default(false),
  prescriptionType: z.object({
    distance: z.boolean().default(false),
    near: z.boolean().default(false),
  }),
  distancePrescription: prescriptionRowSchema.optional().nullable(),
  nearPrescription: prescriptionRowSchema.optional().nullable(),
  doctorName: z.string().optional().nullable().or(z.literal("")),
  prescribedAt: z.string().optional().nullable().or(z.literal("")),
  partyName: z.string().optional().nullable().or(z.literal("")),
  frameName: z.string().optional().nullable().or(z.literal("")),
  estimatedDelivery: z.string().optional().nullable().or(z.literal("")),
  specialInstructions: z.string().optional().nullable().or(z.literal("")),
  prescriptionNotes: z.string().optional().nullable().or(z.literal("")),
  lensType: z.string().optional().nullable().or(z.literal("")),
  rxNumber: z.string().optional().nullable().or(z.literal("")),
  rxCategory: z.string().optional().nullable().or(z.literal("")),
  invoiceEnabled: z.boolean().default(false),
  invoiceItems: z.array(invoiceItemSchema).optional().nullable(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"]).default("CASH"),
  amountPaid: z.coerce.number().min(0).default(0),
  creditApplied: z.coerce.number().min(0).default(0),
  balanceDue: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable().or(z.literal("")),
  deliveryDays: z.coerce.number().min(0).default(0),
});

export type PatientVisitFormValues = z.infer<typeof patientVisitSchema>;

// --- Form State Type ---

export type FormState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
} | undefined;

