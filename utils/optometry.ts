/**
 * Optometry & Eye Prescription Industry Helpers & Standard Datalist Values
 */

/**
 * Calculates patient's age in years from Date of Birth (YYYY-MM-DD)
 */
export function calculateAgeFromDOB(dob: string): string {
  if (!dob) return "";
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return "";
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 0 ? age.toString() : "";
}

/**
 * Calculates estimated Date of Birth (YYYY-01-01) from Age in years
 */
export function calculateDOBFromAge(ageStr: string): string {
  if (!ageStr) return "";
  const age = parseInt(ageStr, 10);
  if (isNaN(age) || age < 0 || age > 120) return "";
  
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  return `${birthYear}-01-01`;
}

/**
 * Standard SPH (Sphere) Diopter Options (-20.00 to +20.00 in 0.25 steps)
 */
export const SPH_OPTIONS: string[] = (() => {
  const list: string[] = ["0.00", "PL"];
  // Plus values
  for (let i = 0.25; i <= 20.0; i += 0.25) {
    list.push(`+${i.toFixed(2)}`);
  }
  // Minus values
  for (let i = -0.25; i >= -20.0; i -= 0.25) {
    list.push(i.toFixed(2));
  }
  return list;
})();

/**
 * Standard CYL (Cylinder) Diopter Options (-10.00 to +10.00 in 0.25 steps)
 */
export const CYL_OPTIONS: string[] = (() => {
  const list: string[] = ["0.00"];
  // Minus CYL (Standard)
  for (let i = -0.25; i >= -10.0; i -= 0.25) {
    list.push(i.toFixed(2));
  }
  // Plus CYL
  for (let i = 0.25; i <= 10.0; i += 0.25) {
    list.push(`+${i.toFixed(2)}`);
  }
  return list;
})();

/**
 * Standard AXIS Degree Options (1 to 180 degrees)
 */
export const AXIS_OPTIONS: string[] = [
  "180", "175", "170", "165", "160", "150", "145", "135", "120", "110", "100", 
  "90", "80", "70", "60", "45", "30", "15", "10", "5", "1"
];

/**
 * Standard Visual Acuity Options for Distance Vision (D.V.)
 */
export const DISTANCE_VN_OPTIONS: string[] = [
  "6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "6/5", "6/4",
  "20/20", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200"
];

/**
 * Standard Visual Acuity Options for Near Vision (N.V.)
 */
export const NEAR_VN_OPTIONS: string[] = [
  "N6", "N8", "N10", "N12", "N18", "N36", "N5", "N4"
];

/**
 * Standard ADD (Reading Addition) Diopter Options (+0.50 to +4.00)
 */
export const ADD_OPTIONS: string[] = (() => {
  const list: string[] = [];
  for (let i = 0.50; i <= 4.00; i += 0.25) {
    list.push(`+${i.toFixed(2)}`);
  }
  return list;
})();

/**
 * Formats a user diopter string to standard optometry notation (e.g. 1.5 -> +1.50, -0.5 -> -0.50)
 */
export function formatDiopterValue(val: string): string {
  if (!val) return "";
  const trimmed = val.trim().toUpperCase();
  if (trimmed === "0" || trimmed === "0.00" || trimmed === "PL" || trimmed === "PLANA") {
    return "+0.00";
  }
  
  const num = parseFloat(trimmed);
  if (isNaN(num)) return trimmed;
  
  if (num > 0) {
    return `+${num.toFixed(2)}`;
  } else {
    return num.toFixed(2);
  }
}

/**
 * Formats axis input to valid 1-180 integer string
 */
export function formatAxisValue(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  const num = parseInt(trimmed, 10);
  if (isNaN(num)) return trimmed;
  
  if (num <= 0) return "180";
  if (num > 180) return "180";
  return num.toString();
}
