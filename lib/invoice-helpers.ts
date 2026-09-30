// Indian Numbering System converter for tax invoice grand totals
export function convertNumberToWords(num: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  const convertLessThanOneThousand = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return (
      a[hundred] +
      " Hundred" +
      (rest ? " " + convertLessThanOneThousand(rest) : "")
    );
  };

  const convert = (n: number): string => {
    if (n < 1000) return convertLessThanOneThousand(n);
    if (n < 100000) {
      const thousand = Math.floor(n / 1000);
      const rest = n % 1000;
      return (
        convertLessThanOneThousand(thousand) +
        " Thousand" +
        (rest ? " " + convertLessThanOneThousand(rest) : "")
      );
    }
    if (n < 10000000) {
      const lakh = Math.floor(n / 100000);
      const rest = n % 100000;
      return (
        convertLessThanOneThousand(lakh) +
        " Lakh" +
        (rest ? " " + convert(rest) : "")
      );
    }
    const crore = Math.floor(n / 10000000);
    const rest = n % 10000000;
    return (
      convertLessThanOneThousand(crore) +
      " Crore" +
      (rest ? " " + convert(rest) : "")
    );
  };

  const integerPart = Math.floor(num);
  const fractionalPart = Math.round((num - integerPart) * 100);

  let result = convert(integerPart) + " Rupees";
  if (fractionalPart > 0) {
    result += " and " + convertLessThanOneThousand(fractionalPart) + " Paise Only";
  } else {
    result += " Only";
  }
  return result;
}

export function safeParseDate(
  date: Date | string | number | null | undefined
): Date | null {
  if (date === null || date === undefined || date === "") return null;

  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof date === "number") {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof date === "string") {
    const trimmed = date.trim();
    if (!trimmed || trimmed === "N/A" || trimmed === "null" || trimmed === "undefined" || trimmed === "Invalid Date") {
      return null;
    }

    // 1. Try standard ISO / Date constructor
    let d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;

    // 2. Try DD/MM/YYYY or DD-MM-YYYY (Indian optical billing standard)
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const rest = ddmmyyyy[4]?.trim();
      if (rest) {
        d = new Date(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")} ${rest}`);
      } else {
        d = new Date(year, month, day);
      }
      if (!isNaN(d.getTime())) return d;
    }

    // 3. Try YYYY-MM-DD or YYYY/MM/DD without time
    const yyyymmdd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export function safeToISODate(
  date: Date | string | number | null | undefined,
  fallback: string | null = null
): string | null {
  const d = safeParseDate(date);
  if (!d) return fallback;
  try {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return fallback;
  }
}

export function safeToISOTimestamp(
  date: Date | string | number | null | undefined,
  fallback: string | null = null
): string | null {
  const d = safeParseDate(date);
  if (!d) return fallback;
  try {
    return d.toISOString();
  } catch {
    return fallback;
  }
}

export function safeFormatDateLocale(
  date: Date | string | number | null | undefined,
  fallback = "N/A",
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  const d = safeParseDate(date);
  if (!d) return fallback;
  try {
    return d.toLocaleDateString("en-IN", options);
  } catch {
    return fallback;
  }
}

export function formatDateDMY(date: Date | string | number | null | undefined): string {
  const d = safeParseDate(date);
  if (!d) return "";
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

export function formatDateDMonthY(date: Date | string | number | null | undefined): string {
  const d = safeParseDate(date);
  if (!d) return "";
  const day = d.getDate();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatPrescriptionVal(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

export function formatDecimal(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(num) ? "0.00" : num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatReceiptDate(date: Date | string | number | null | undefined): string {
  const d = safeParseDate(date);
  if (!d) return "";
  try {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).toUpperCase();
  } catch {
    return "";
  }
}

export function formatReceiptTime(date: Date | string | number | null | undefined): string {
  const d = safeParseDate(date);
  if (!d) return "";
  try {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

