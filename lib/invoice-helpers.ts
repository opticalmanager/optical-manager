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

export function formatDateDMY(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

export function formatDateDMonthY(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
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

export function formatReceiptDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

export function formatReceiptTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
