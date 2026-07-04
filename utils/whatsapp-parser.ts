/**
 * Parse WhatsApp Template Variables
 * Matches placeholders like {{customer_name}} or {{ customer_name }} (case-insensitive)
 * and replaces them with matching values from the variables dictionary.
 */
export function parseWhatsAppTemplate(template: string, variables: Record<string, string>): string {
  if (!template) return "";
  let result = template;
  Object.entries(variables).forEach(([key, val]) => {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    result = result.replace(placeholder, val || "");
  });
  return result;
}
