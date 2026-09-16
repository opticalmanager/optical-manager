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
