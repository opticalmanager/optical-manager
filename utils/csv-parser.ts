/**
 * High-performance RFC-4180 compliant CSV Parser & Auto-Mapping Utilities.
 */

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface CustomerFieldDefinition {
  key: string;
  label: string;
  required: boolean;
  description: string;
  aliases: string[];
}

export const CUSTOMER_SYSTEM_FIELDS: CustomerFieldDefinition[] = [
  {
    key: "fullName",
    label: "Full Name",
    required: true,
    description: "Customer / Patient's complete name",
    aliases: [
      "full name",
      "fullname",
      "name",
      "customer name",
      "patient name",
      "client name",
      "customer",
      "patient",
      "client",
      "first name",
    ],
  },
  {
    key: "phone",
    label: "Phone / Mobile",
    required: true,
    description: "10-digit mobile number",
    aliases: [
      "phone",
      "phone number",
      "phonenumber",
      "mobile",
      "mobile number",
      "mobilenumber",
      "contact",
      "contact no",
      "contact number",
      "cell",
      "whatsapp",
      "tel",
      "telephone",
    ],
  },
  {
    key: "email",
    label: "Email Address",
    required: false,
    description: "Valid email address for digital receipts",
    aliases: [
      "email",
      "e-mail",
      "email address",
      "mail",
      "e-mail address",
      "electronic mail",
    ],
  },
  {
    key: "gender",
    label: "Gender",
    required: false,
    description: "MALE, FEMALE, or OTHER",
    aliases: ["gender", "sex"],
  },
  {
    key: "age",
    label: "Age (Years)",
    required: false,
    description: "Age in years (e.g. 28)",
    aliases: ["age", "years", "yrs", "age (yrs)", "age in years"],
  },
  {
    key: "dateOfBirth",
    label: "Date of Birth",
    required: false,
    description: "YYYY-MM-DD or DD/MM/YYYY",
    aliases: [
      "dob",
      "date of birth",
      "dateofbirth",
      "birth date",
      "birthdate",
      "birthday",
    ],
  },
  {
    key: "address",
    label: "Street Address",
    required: false,
    description: "House/Flat number, building, street",
    aliases: [
      "address",
      "street",
      "location",
      "residence",
      "addr",
      "residential address",
      "home address",
    ],
  },
  {
    key: "city",
    label: "City / Town",
    required: false,
    description: "City or town name",
    aliases: ["city", "town", "district", "place"],
  },
  {
    key: "state",
    label: "State",
    required: false,
    description: "State or province",
    aliases: ["state", "province", "region"],
  },
  {
    key: "pincode",
    label: "Pincode / ZIP",
    required: false,
    description: "6-digit postal code",
    aliases: [
      "pincode",
      "pin code",
      "pin",
      "zip",
      "zip code",
      "zipcode",
      "postal code",
      "postal",
      "postcode",
    ],
  },
  {
    key: "referredBy",
    label: "Referred By",
    required: false,
    description: "Doctor name, friend, or reference",
    aliases: [
      "referred by",
      "referredby",
      "reference",
      "ref by",
      "doctor",
      "dr",
      "doctor name",
      "prescribed by",
    ],
  },
  {
    key: "gstin",
    label: "GST Number (GSTIN)",
    required: false,
    description: "15-character GSTIN tax registration number",
    aliases: [
      "gst",
      "gstin",
      "gst no",
      "gst number",
      "gstin no",
      "gstin number",
      "tax id",
      "tax number",
      "customer gst",
      "customer gstin",
    ],
  },
  {
    key: "notes",
    label: "Notes / Remarks",
    required: false,
    description: "Clinical notes or customer remarks",
    aliases: [
      "notes",
      "note",
      "remarks",
      "remark",
      "comments",
      "comment",
      "description",
      "history",
    ],
  },
];

/**
 * Robust RFC-4180 CSV Text Parser.
 * Handles embedded commas, newlines within quotes, escaped double quotes, and BOM markers.
 */
export function parseCSV(csvText: string): ParsedCSV {
  // Strip UTF-8 Byte Order Mark if present
  let cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i++; // skip escaped quote
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") {
          i++; // Skip \n in CRLF
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // Push final trailing field/row if any
  currentRow.push(currentField.trim());
  if (currentRow.some((field) => field !== "")) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell !== ""));

  return {
    headers,
    rows: dataRows,
    totalRows: dataRows.length,
  };
}

/**
 * Intelligent field auto-matching engine.
 * Maps system fields to CSV headers using fuzzy normalized alias matching.
 */
export function autoMapCSVHeaders(
  csvHeaders: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedCsvHeaders = csvHeaders.map((header) => ({
    original: header,
    normalized: header.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));

  for (const sysField of CUSTOMER_SYSTEM_FIELDS) {
    let matchedHeader = "";

    // 1. Direct exact or normalized match against aliases
    for (const alias of sysField.aliases) {
      const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
      const found = normalizedCsvHeaders.find(
        (h) => h.normalized === normalizedAlias
      );
      if (found) {
        matchedHeader = found.original;
        break;
      }
    }

    // 2. Partial substring match if not directly matched
    if (!matchedHeader) {
      for (const alias of sysField.aliases) {
        const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (normalizedAlias.length >= 3) {
          const found = normalizedCsvHeaders.find(
            (h) =>
              h.normalized.includes(normalizedAlias) ||
              normalizedAlias.includes(h.normalized)
          );
          if (found) {
            matchedHeader = found.original;
            break;
          }
        }
      }
    }

    mapping[sysField.key] = matchedHeader || "";
  }

  return mapping;
}

/**
 * Generates and triggers download of a standardized CSV sample template.
 */
export function downloadSampleCustomerCSV() {
  const headers = [
    "Full Name",
    "Phone",
    "Email",
    "Gender",
    "Age",
    "Date of Birth",
    "Address",
    "City",
    "State",
    "Pincode",
    "Referred By",
    "Notes",
  ];

  const sampleRows = [
    [
      "Rajesh Sharma",
      "9876543210",
      "rajesh.sharma@example.com",
      "MALE",
      "35",
      "1991-05-12",
      "Flat 402 Sunshine Apts, MG Road",
      "Mumbai",
      "Maharashtra",
      "400001",
      "Dr. A. K. Gupta",
      "Regular checkup client",
    ],
    [
      "Priya Patel",
      "9823456789",
      "priya.patel@example.com",
      "FEMALE",
      "28",
      "1998-11-20",
      "B-12 Lotus Residency",
      "Ahmedabad",
      "Gujarat",
      "380015",
      "Self",
      "First time patient",
    ],
    [
      "Amit Verma",
      "9123456780",
      "amit.verma@example.com",
      "MALE",
      "42",
      "1984-03-15",
      "45 Station Road",
      "Pune",
      "Maharashtra",
      "411001",
      "Dr. K. Nair",
      "Prefers progressive lenses",
    ],
  ];

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...sampleRows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `optical_customer_import_template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// PURCHASE INVENTORY CSV IMPORT UTILITIES
// -------------------------------------------------------------

export interface PurchaseFieldDefinition {
  key: string;
  label: string;
  required: boolean;
  description: string;
  aliases: string[];
}

export const PURCHASE_SYSTEM_FIELDS: PurchaseFieldDefinition[] = [
  {
    key: "productCode",
    label: "Product Code / Barcode",
    required: true,
    description: "Unique model number, barcode or vendor product code",
    aliases: [
      "product code",
      "productcode",
      "code",
      "item code",
      "itemcode",
      "barcode",
      "sku",
      "model no",
      "model number",
      "modelnum",
      "part number",
      "article no",
    ],
  },
  {
    key: "productName",
    label: "Product Name",
    required: true,
    description: "Descriptive name of the frame, lens, or accessory",
    aliases: [
      "product name",
      "productname",
      "name",
      "item name",
      "itemname",
      "description",
      "product description",
      "item description",
      "title",
    ],
  },
  {
    key: "category",
    label: "Category",
    required: false,
    description: "FRAME, LENS, CONTACT_LENS, ACCESSORY, or SOLUTION",
    aliases: [
      "category",
      "product category",
      "type",
      "product type",
      "item type",
      "group",
    ],
  },
  {
    key: "quantity",
    label: "Quantity (Units)",
    required: true,
    description: "Number of units received in this inward purchase",
    aliases: [
      "quantity",
      "qty",
      "units",
      "count",
      "inward qty",
      "purchase qty",
      "stock",
      "pcs",
      "pieces",
    ],
  },
  {
    key: "unitPrice",
    label: "Cost Price / Unit Rate (₹)",
    required: true,
    description: "Net purchase cost per unit (before/excluding tax)",
    aliases: [
      "unit price",
      "unit cost",
      "cost price",
      "cost",
      "purchase price",
      "purchase rate",
      "rate",
      "buy price",
      "price/unit",
    ],
  },
  {
    key: "retailPrice",
    label: "Selling / Retail Price (₹)",
    required: false,
    description: "Customer retail selling price (MRP)",
    aliases: [
      "retail price",
      "selling price",
      "mrp",
      "sale price",
      "retail",
      "sales price",
      "customer price",
    ],
  },
  {
    key: "gstPercent",
    label: "GST Rate (%)",
    required: false,
    description: "GST tax rate (e.g. 12 for spectacles, 18 for solutions)",
    aliases: [
      "gst",
      "gst %",
      "gst percent",
      "tax",
      "tax %",
      "tax percent",
      "tax rate",
      "gst rate",
    ],
  },
  {
    key: "hsnCode",
    label: "HSN Code",
    required: false,
    description: "Harmonized System Nomenclature (e.g. 9004, 9001)",
    aliases: [
      "hsn",
      "hsn code",
      "hsn/sac",
      "sac",
      "commodity code",
    ],
  },
  {
    key: "brand",
    label: "Brand / Manufacturer",
    required: false,
    description: "Brand name (e.g. Ray-Ban, Essilor, Crizal)",
    aliases: [
      "brand",
      "make",
      "manufacturer",
      "company",
      "brand name",
    ],
  },
  {
    key: "model",
    label: "Model / Design Name",
    required: false,
    description: "Model designation or frame design collection",
    aliases: [
      "model",
      "model name",
      "design",
      "collection",
      "series",
    ],
  },
  {
    key: "rackLocation",
    label: "Rack / Shelf Location",
    required: false,
    description: "Physical storage location in store (e.g. Rack A-2)",
    aliases: [
      "rack",
      "rack location",
      "shelf",
      "shelf location",
      "location",
      "bin",
      "tray",
    ],
  },
  {
    key: "details",
    label: "Specifications / Remarks",
    required: false,
    description: "Size, color, dimensions, or technical specifications",
    aliases: [
      "details",
      "specs",
      "specifications",
      "remarks",
      "notes",
      "extra info",
      "comments",
    ],
  },
];

/**
 * Intelligent auto-mapping of CSV headers to Purchase fields.
 */
export function autoMapPurchaseCSVHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    cleaned: h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""),
  }));

  for (const field of PURCHASE_SYSTEM_FIELDS) {
    const matched = normalizedHeaders.find((h) => {
      const fieldClean = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const labelClean = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (h.cleaned === fieldClean || h.cleaned === labelClean) return true;

      return field.aliases.some((alias) => {
        const aliasClean = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
        return h.cleaned === aliasClean;
      });
    });

    if (matched) {
      mapping[field.key] = matched.original;
    }
  }

  return mapping;
}

/**
 * Generates and triggers download of a standardized Purchase Bulk Import CSV template.
 */
export function downloadSamplePurchaseCSV() {
  const headers = [
    "Product Code",
    "Product Name",
    "Category",
    "Brand",
    "Model",
    "Quantity",
    "Unit Cost Price",
    "Retail Selling Price",
    "HSN Code",
    "GST %",
    "Rack Location",
    "Details",
  ];

  const sampleRows = [
    [
      "RB-3025-001",
      "Ray-Ban Aviator Classic Gold 58mm",
      "FRAME",
      "Ray-Ban",
      "Aviator Classic",
      "10",
      "3400.00",
      "5890.00",
      "9004",
      "12",
      "Display Case A-1",
      "Metal Gold, G-15 Green Lens 58-14-135",
    ],
    [
      "ESS-CRIZAL-156",
      "Essilor 1.56 Crizal Easy UV Single Vision",
      "LENS",
      "Essilor",
      "Crizal Easy Pro",
      "24",
      "650.00",
      "1400.00",
      "9001",
      "12",
      "Lens Cabinet 2",
      "Index 1.56, Anti-Reflective, Blue Cut",
    ],
    [
      "BAUSCH-SL38-M",
      "Bausch & Lomb SofLens 38 Monthly (6 Pack)",
      "CONTACT_LENS",
      "Bausch & Lomb",
      "SofLens 38",
      "15",
      "520.00",
      "950.00",
      "9001",
      "12",
      "CL Drawer 1",
      "Monthly Disposable, Base Curve 8.7, Dia 14.0",
    ],
    [
      "RENU-MPS-355",
      "ReNu Fresh Multi-Purpose Solution 355ml",
      "SOLUTION",
      "Bausch & Lomb",
      "ReNu Fresh",
      "20",
      "240.00",
      "430.00",
      "3307",
      "18",
      "Solution Shelf C",
      "Disinfecting solution with lens case",
    ],
    [
      "HARD-CASE-PRM",
      "Premium Leatherette Spectacle Hard Case",
      "ACCESSORY",
      "OptiCare",
      "Executive Case",
      "50",
      "45.00",
      "150.00",
      "4202",
      "18",
      "Storage Bin B-4",
      "Magnetic closure with microfiber cloth",
    ],
  ];

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...sampleRows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `optical_purchase_import_template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * System target fields for Historical Invoices & Sales Ingestion.
 */
export interface InvoiceFieldDefinition {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

export const INVOICE_SYSTEM_FIELDS: InvoiceFieldDefinition[] = [
  // Customer Details
  { key: "customerName", label: "Customer / Patient Name", required: true, description: "Full name of the customer" },
  { key: "customerPhone", label: "Customer Mobile / Phone", required: true, description: "10-digit mobile number for matching/creating profile" },
  { key: "customerEmail", label: "Customer Email", required: false, description: "Email address for digital receipts" },
  { key: "customerGender", label: "Gender", required: false, description: "Male, Female, or Other" },
  { key: "customerCity", label: "City / Town", required: false, description: "Customer residence city" },
  { key: "customerAddress", label: "Customer Address", required: false, description: "Full postal address" },
  
  // Invoice Metadata
  { key: "invoiceNumber", label: "Invoice / Bill Number", required: false, description: "Existing bill number (auto-generated if omitted)" },
  { key: "invoiceDate", label: "Invoice Date", required: false, description: "Date of sale (e.g. 2024-05-18 or 18/05/2024)" },
  { key: "soldBy", label: "Sold By / Salesperson", required: false, description: "Sales representative who closed the transaction" },

  // Line Item & Financials
  { key: "itemDescription", label: "Item Description / Particulars", required: true, description: "Optical product or eyewear description" },
  { key: "quantity", label: "Quantity", required: false, description: "Units sold (default: 1)" },
  { key: "unitPrice", label: "Unit Rate / Price (₹)", required: false, description: "Selling rate per unit" },
  { key: "discountAmount", label: "Discount (₹ or %)", required: false, description: "Discount deducted on line item or bill" },
  { key: "taxPercent", label: "GST / Tax %", required: false, description: "GST tax rate (0%, 5%, 12%, 18%)" },
  { key: "taxAmount", label: "Tax Amount (₹)", required: false, description: "Total tax calculated on this item" },
  { key: "totalAmount", label: "Net Total Amount (₹)", required: true, description: "Final payable amount for this line or invoice" },

  // Payment & Fulfillment
  { key: "amountPaid", label: "Amount Paid (₹)", required: false, description: "Payment collected (defaults to total if marked PAID)" },
  { key: "paymentMethod", label: "Payment Mode", required: false, description: "CASH, UPI, CARD, or BANK_TRANSFER" },
  { key: "paymentStatus", label: "Payment Status", required: false, description: "PAID, PARTIALLY_PAID, or PENDING" },
  { key: "fulfillmentStatus", label: "Delivery / Fulfillment Status", required: false, description: "DELIVERED, READY, or PROCESSING (default: DELIVERED)" },
  { key: "notes", label: "Notes / Remarks", required: false, description: "Prescription powers, frame details, or special instructions" },
];

/**
 * Intelligent auto-mapping for Invoice CSV headers.
 */
export function autoMapInvoiceCSVHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const matchRules: Array<{ key: string; patterns: RegExp[] }> = [
    {
      key: "invoiceNumber",
      patterns: [/^(invoice|inv|bill|memo|receipt)[_\-\s]*(no|num|number|id|#)?$/i, /^bill_?no$/i, /^inv_?no$/i, /^voucher_?no$/i],
    },
    {
      key: "invoiceDate",
      patterns: [/^(invoice|inv|bill|sale|order|txn)[_\-\s]*(date|dt|time|timestamp)?$/i, /^date$/i, /^bill_?date$/i],
    },
    {
      key: "customerName",
      patterns: [/^(customer|client|patient|party|buyer|cust)[_\-\s]*(name|full_?name)?$/i, /^party_?name$/i, /^name$/i],
    },
    {
      key: "customerPhone",
      patterns: [/^(customer|client|patient|party)?[_\-\s]*(phone|mobile|contact|cell|tel)[_\-\s]*(no|num|number)?$/i, /^mobile$/i, /^phone$/i, /^whatsapp$/i],
    },
    {
      key: "customerEmail",
      patterns: [/^(customer|client|patient)?[_\-\s]*(email|e_?mail|mail)[_\-\s]*(id|address)?$/i],
    },
    {
      key: "customerGender",
      patterns: [/^(gender|sex)$/i],
    },
    {
      key: "customerCity",
      patterns: [/^(city|town|district)$/i],
    },
    {
      key: "customerAddress",
      patterns: [/^(address|addr|street|location)$/i],
    },
    {
      key: "soldBy",
      patterns: [/^(sold_?by|sales_?person|salesman|attended_?by|agent|staff)$/i],
    },
    {
      key: "itemDescription",
      patterns: [/^(item|product|description|particulars|item_?name|item_?desc|details|product_?name)$/i],
    },
    {
      key: "quantity",
      patterns: [/^(qty|quantity|units|count|nos)$/i],
    },
    {
      key: "unitPrice",
      patterns: [/^(rate|unit_?price|price|cost|mrp|unit_?rate)$/i],
    },
    {
      key: "discountAmount",
      patterns: [/^(discount|disc|rebate|discount_?amount|disc_?amt|discount_?val)$/i],
    },
    {
      key: "taxPercent",
      patterns: [/^(gst|tax|gst_?percent|tax_?percent|gst_?%|tax_?%|vat)$/i],
    },
    {
      key: "taxAmount",
      patterns: [/^(gst_?amount|tax_?amount|tax_?amt|cgst_?sgst|gst_?val)$/i],
    },
    {
      key: "totalAmount",
      patterns: [/^(total|total_?amount|net_?amount|net_?total|grand_?total|bill_?amount|final_?amount|amount)$/i],
    },
    {
      key: "amountPaid",
      patterns: [/^(amount_?paid|paid|paid_?amount|advance|advance_?amount|received)$/i],
    },
    {
      key: "paymentMethod",
      patterns: [/^(payment_?method|payment_?mode|pay_?mode|mode|mop|payment_?type)$/i],
    },
    {
      key: "paymentStatus",
      patterns: [/^(payment_?status|pay_?status|status)$/i],
    },
    {
      key: "fulfillmentStatus",
      patterns: [/^(fulfillment_?status|delivery_?status|order_?status|delivery)$/i],
    },
    {
      key: "notes",
      patterns: [/^(notes|remarks|comments|prescription|instructions|specs)$/i],
    },
  ];

  for (const header of headers) {
    const cleanHeader = header.trim();
    for (const rule of matchRules) {
      if (!mapping[rule.key]) {
        for (const pattern of rule.patterns) {
          if (pattern.test(cleanHeader)) {
            mapping[rule.key] = cleanHeader;
            break;
          }
        }
      }
    }
  }

  return mapping;
}

/**
 * Downloads a sample CSV template for Historical Invoices Ingestion.
 */
export function downloadSampleInvoiceCSV(): void {
  const headers = [
    "Invoice Number",
    "Invoice Date",
    "Customer Name",
    "Mobile Number",
    "Email",
    "City",
    "Item Description",
    "Quantity",
    "Unit Price",
    "Discount",
    "GST Percent",
    "Total Amount",
    "Amount Paid",
    "Payment Mode",
    "Payment Status",
    "Delivery Status",
    "Sold By",
    "Notes",
  ];

  const sampleRows = [
    [
      "INV-2024-001",
      "2024-06-15",
      "Amit Sharma",
      "9876543210",
      "amit.sharma@example.com",
      "New Delhi",
      "Titan Blue Titanium Rimless Frame + 1.61 Crizal Prevencia Anti-Glare Lenses",
      "1",
      "4500.00",
      "500.00",
      "12",
      "4000.00",
      "4000.00",
      "UPI",
      "PAID",
      "DELIVERED",
      "Vikram Singh",
      "OD: -2.50 DS, OS: -2.00 DS / -0.50 DC x 90",
    ],
    [
      "INV-2024-002",
      "2024-06-18",
      "Priya Patel",
      "9123456780",
      "priya.p@example.com",
      "Ahmedabad",
      "Ray-Ban Aviator RB3025 Polarized Sunglasses",
      "1",
      "7890.00",
      "0.00",
      "18",
      "7890.00",
      "5000.00",
      "CARD",
      "PARTIALLY_PAID",
      "DELIVERED",
      "Pooja Sharma",
      "Balance ₹2890 pending on pickup",
    ],
    [
      "INV-2024-003",
      "2024-07-02",
      "Rajesh Verma",
      "9811223344",
      "",
      "Noida",
      "Bausch & Lomb SofLens 38 Monthly Contact Lenses (Box of 6)",
      "2",
      "950.00",
      "100.00",
      "12",
      "1800.00",
      "1800.00",
      "CASH",
      "PAID",
      "DELIVERED",
      "Vikram Singh",
      "Power -3.25 both eyes",
    ],
    [
      "INV-2024-004",
      "2024-07-10",
      "Sunita Gupta",
      "9899001122",
      "sunita.g@example.com",
      "Gurugram",
      "Fastrack Cateye Acetate Spectacles Frame",
      "1",
      "1800.00",
      "200.00",
      "12",
      "1600.00",
      "1600.00",
      "UPI",
      "PAID",
      "DELIVERED",
      "Pooja Sharma",
      "Includes microfiber cloth and protective case",
    ],
    [
      "INV-2024-005",
      "2024-08-01",
      "Mohammad Arshad",
      "9711334455",
      "",
      "Faridabad",
      "Reading Glasses +2.00 Anti-Scratch Polycarbonate",
      "1",
      "850.00",
      "50.00",
      "12",
      "800.00",
      "800.00",
      "CASH",
      "PAID",
      "DELIVERED",
      "Vikram Singh",
      "Near vision test completed",
    ],
  ];

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...sampleRows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `optical_invoices_import_template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

