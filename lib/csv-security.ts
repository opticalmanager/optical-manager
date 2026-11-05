/**
 * Neutralizes CSV formula injection characters (=, +, -, @, \t, \r)
 * according to OWASP CSV Injection prevention guidelines.
 */
export function sanitizeCSVValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // Pure numbers (including negative values like -50.00) are safe and should remain numeric for spreadsheet calculations
  const isPureNumber = typeof val === "number" || /^-?\d+(\.\d+)?$/.test(str.trim());

  // If the cell starts with formula characters and is not a pure number, prefix with single quote
  if (!isPureNumber && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180 compliance: wrap in double quotes if it contains commas, quotes, or newlines
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }

  return str;
}
