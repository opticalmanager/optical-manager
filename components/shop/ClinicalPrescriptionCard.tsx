"use client";

import React, { useState } from "react";
import { Eye, Plus, Calendar, Stethoscope, ChevronDown, Check, Download } from "lucide-react";
import { toast } from "sonner";

export interface ClinicalPrescriptionValues {
  rxNumber?: string;
  rxCategory?: string; // "SPECTACLES" | "CONTACT_LENS"
  activeMode?: "ALL" | "DISTANCE" | "NEAR";
  lensType?: string;
  doctorName?: string;
  prescribedAt?: string;

  // Right eye (OD)
  rightSphere?: string;
  rightCylinder?: string;
  rightAxis?: string;
  rightAdd?: string;
  rightNv?: string;
  pdRight?: string;
  caddRight?: string;

  // Left eye (OS)
  leftSphere?: string;
  leftCylinder?: string;
  leftAxis?: string;
  leftAdd?: string;
  leftNv?: string;
  pdLeft?: string;
  caddLeft?: string;

  // Additional
  pd?: string;
  notes?: string;
}

export interface ClinicalPrescriptionCardProps {
  values: ClinicalPrescriptionValues;
  onChange?: (updated: ClinicalPrescriptionValues) => void;
  doctorSuggestions?: string[];
  readOnly?: boolean;
  className?: string;
  onClear?: () => void;
}

// Diopter Auto-formatter (+0.50, -1.25, plano)
export function formatDiopter(val: string | undefined | null): string {
  if (!val || val.trim() === "") return "";
  const cleaned = val.trim().toLowerCase();
  if (cleaned === "plano" || cleaned === "pl" || cleaned === "0" || cleaned === "0.00") return "0.00";
  const num = parseFloat(cleaned);
  if (isNaN(num)) return val;
  return `${num > 0 ? "+" : ""}${num.toFixed(2)}`;
}

// Axis Auto-formatter (1 to 180)
export function formatAxis(val: string | undefined | null): string {
  if (!val || val.trim() === "") return "";
  const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return "";
  const clamped = Math.max(1, Math.min(180, num));
  return `${clamped}`;
}

export const STANDARD_LENS_TYPES = [
  "Single Vision",
  "Bifocal (Kryptok)",
  "Bifocal (D-Segment)",
  "Progressive (Standard)",
  "Progressive (Digital Freeform)",
  "Blue Cut / Computer Protection",
  "Anti-Reflective (ARC)",
  "Photochromic / Transitions",
  "Polarized",
  "Polycarbonate Impact-Resistant",
  "High Index 1.61 / 1.67",
];

export function ClinicalPrescriptionCard({
  values,
  onChange,
  doctorSuggestions = [],
  readOnly = false,
  className = "",
  onClear,
}: ClinicalPrescriptionCardProps) {
  const [rxCategory, setRxCategory] = useState<"SPECTACLES" | "CONTACT_LENS">(
    (values.rxCategory as any) || "SPECTACLES"
  );
  const [activeTab, setActiveTab] = useState<"SPECTACLES" | "CONTACT_LENS" | "DISTANCE" | "NEAR">("SPECTACLES");

  const updateField = (field: keyof ClinicalPrescriptionValues, val: string) => {
    if (!onChange) return;
    const updated = { ...values, [field]: val };

    // Smart Optometry Bilateral Logic:
    // 1. When Right ADD is entered, presbyopia addition is universally bilateral — auto-sync Left ADD if empty or was matching
    if (field === "rightAdd" && (!values.leftAdd || values.leftAdd === values.rightAdd)) {
      updated.leftAdd = val;
    }

    // 2. When Right monocular PD is entered (e.g. 31.5), auto-sync Left PD if empty
    if (field === "pdRight" && (!values.pdLeft || values.pdLeft === values.pdRight)) {
      updated.pdLeft = val;
    }

    onChange(updated);
  };

  const handleBlurDiopter = (field: keyof ClinicalPrescriptionValues, val: string) => {
    const formatted = formatDiopter(val);
    if (formatted !== val) {
      updateField(field, formatted);
    }
  };

  const handleBlurAxis = (field: keyof ClinicalPrescriptionValues, val: string) => {
    const formatted = formatAxis(val);
    if (formatted !== val) {
      updateField(field, formatted);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({
        ...values,
        rightSphere: "",
        rightCylinder: "",
        rightAxis: "",
        rightAdd: "",
        rightNv: "",
        pdRight: "",
        caddRight: "",
        leftSphere: "",
        leftCylinder: "",
        leftAxis: "",
        leftAdd: "",
        leftNv: "",
        pdLeft: "",
        caddLeft: "",
      });
    }
  };

  const rxDisplayNum = values.rxNumber || "PR-8821";

  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* 1. COMPACT CLINICAL HEADER */}
      <div className="py-3 px-4 md:px-5 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3">
        {/* Left Title & Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb]">
            <Eye className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-slate-900">
              SPECT(S) RX / CLINICAL PRESCRIPTION
            </h3>
            <span className="bg-blue-50/80 text-[#2563eb] border border-blue-200/70 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight shadow-2xs">
              Rx #{rxDisplayNum}
            </span>
          </div>
        </div>

        {/* Right Tab Pills & Quick Actions */}
        {!readOnly && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("SPECTACLES");
                  setRxCategory("SPECTACLES");
                  updateField("rxCategory", "SPECTACLES");
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "SPECTACLES"
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Spect(s) Rx
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("CONTACT_LENS");
                  setRxCategory("CONTACT_LENS");
                  updateField("rxCategory", "CONTACT_LENS");
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "CONTACT_LENS"
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                CL Rx
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("DISTANCE");
                  updateField("activeMode", "DISTANCE");
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "DISTANCE"
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Distance
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("NEAR");
                  updateField("activeMode", "NEAR");
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "NEAR"
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Near
              </button>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#2563eb] bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
              title="Clear / New Prescription Blank"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Rx</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. HIGH-DENSITY CLINICAL RX TABLE */}
      <div className="p-3 md:p-4 overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-150 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              <th className="py-2 px-3 text-left w-28">EYE / TYPE</th>
              <th className="py-2 px-2 w-24">SPHL. (SPH)</th>
              <th className="py-2 px-2 w-24">CYL. (CYL)</th>
              <th className="py-2 px-2 w-20">AXIS (°)</th>
              <th className="py-2 px-2 w-24 text-[#2563eb]">ADDN. (ADD)</th>
              <th className="py-2 px-2 w-24">VISION (V/N)</th>
              <th className="py-2 px-2 w-24">P.D. (MM)</th>
              <th className="py-2 px-2 w-20">CADD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-bold">
            {/* ROW 1: RIGHT EYE (OD) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-2 px-3 text-left">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-[#2563eb] shrink-0 shadow-xs" />
                  <span className="font-extrabold text-slate-800 text-xs">RE</span>
                  <span className="text-[10px] text-slate-400 font-semibold">(Right/OD)</span>
                </div>
              </td>
              {/* SPH */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.rightSphere || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-sph-options"
                    placeholder="+0.50"
                    value={values.rightSphere || ""}
                    onChange={(e) => updateField("rightSphere", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("rightSphere", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* CYL */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.rightCylinder || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-cyl-options"
                    placeholder="-0.25"
                    value={values.rightCylinder || ""}
                    onChange={(e) => updateField("rightCylinder", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("rightCylinder", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* AXIS */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.rightAxis ? `${values.rightAxis}°` : "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-axis-options"
                    placeholder="180"
                    value={values.rightAxis || ""}
                    onChange={(e) => updateField("rightAxis", e.target.value)}
                    onBlur={(e) => handleBlurAxis("rightAxis", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* ADDN (ADD) - VIBRANT LIGHT BLUE ACCENT HIGHLIGHT */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="inline-block px-2.5 py-1 bg-blue-50/80 text-[#2563eb] font-extrabold rounded-md border border-blue-200/60">
                    {values.rightAdd || "-"}
                  </span>
                ) : (
                  <input
                    type="text"
                    list="clinical-add-options"
                    placeholder="+1.50"
                    value={values.rightAdd || ""}
                    onChange={(e) => updateField("rightAdd", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("rightAdd", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-blue-50/70 border border-blue-200/90 rounded-lg text-xs font-extrabold text-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] transition-all shadow-2xs"
                  />
                )}
              </td>
              {/* VISION (V/N) */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-semibold text-slate-700">{values.rightNv || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-vn-options"
                    placeholder="6/6"
                    value={values.rightNv || ""}
                    onChange={(e) => updateField("rightNv", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* P.D. (MM) */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-semibold text-slate-700">{values.pdRight ? `${values.pdRight}` : "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-pd-options"
                    placeholder="31.5"
                    value={values.pdRight || ""}
                    onChange={(e) => updateField("pdRight", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* CADD */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="text-slate-400 font-medium">{values.caddRight || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-cadd-options"
                    placeholder="-"
                    value={values.caddRight || ""}
                    onChange={(e) => updateField("caddRight", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
            </tr>

            {/* ROW 2: LEFT EYE (OS) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-2 px-3 text-left">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                  <span className="font-extrabold text-slate-800 text-xs">LE</span>
                  <span className="text-[10px] text-slate-400 font-semibold">(Left/OS)</span>
                </div>
              </td>
              {/* SPH */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.leftSphere || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-sph-options"
                    placeholder="+0.50"
                    value={values.leftSphere || ""}
                    onChange={(e) => updateField("leftSphere", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("leftSphere", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* CYL */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.leftCylinder || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-cyl-options"
                    placeholder="-0.50"
                    value={values.leftCylinder || ""}
                    onChange={(e) => updateField("leftCylinder", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("leftCylinder", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* AXIS */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.leftAxis ? `${values.leftAxis}°` : "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-axis-options"
                    placeholder="175"
                    value={values.leftAxis || ""}
                    onChange={(e) => updateField("leftAxis", e.target.value)}
                    onBlur={(e) => handleBlurAxis("leftAxis", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* ADDN (ADD) - VIBRANT LIGHT BLUE ACCENT HIGHLIGHT */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="inline-block px-2.5 py-1 bg-blue-50/80 text-[#2563eb] font-extrabold rounded-md border border-blue-200/60">
                    {values.leftAdd || "-"}
                  </span>
                ) : (
                  <input
                    type="text"
                    list="clinical-add-options"
                    placeholder="+1.50"
                    value={values.leftAdd || ""}
                    onChange={(e) => updateField("leftAdd", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("leftAdd", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-blue-50/70 border border-blue-200/90 rounded-lg text-xs font-extrabold text-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] transition-all shadow-2xs"
                  />
                )}
              </td>
              {/* VISION (V/N) */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-semibold text-slate-700">{values.leftNv || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-vn-options"
                    placeholder="6/9"
                    value={values.leftNv || ""}
                    onChange={(e) => updateField("leftNv", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* P.D. (MM) */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="font-semibold text-slate-700">{values.pdLeft ? `${values.pdLeft}` : "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-pd-options"
                    placeholder="31.5"
                    value={values.pdLeft || ""}
                    onChange={(e) => updateField("pdLeft", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
              {/* CADD */}
              <td className="py-1.5 px-1.5">
                {readOnly ? (
                  <span className="text-slate-400 font-medium">{values.caddLeft || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-cadd-options"
                    placeholder="-"
                    value={values.caddLeft || ""}
                    onChange={(e) => updateField("caddLeft", e.target.value)}
                    className="w-full text-center py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. BOTTOM CLINICAL CONTROLS (LENS TYPE, DOCTOR, PRESCRIPTION DATE, ACTIONS) */}
      <div className="py-1.5 px-3 border-t border-slate-150 bg-slate-50/30 flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5 justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
          {/* LENS TYPE */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
              LENS TYPE
            </label>
            {readOnly ? (
              <div className="text-xs font-bold text-slate-800">{values.lensType || "Single Vision"}</div>
            ) : (
              <div className="relative">
                <select
                  value={values.lensType || "Single Vision"}
                  onChange={(e) => updateField("lensType", e.target.value)}
                  className="w-full h-8 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] appearance-none cursor-pointer transition-all shadow-2xs"
                >
                  {STANDARD_LENS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* PRESCRIBED BY (DOCTOR) */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
              PRESCRIBED BY (DOCTOR)
            </label>
            {readOnly ? (
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>{values.doctorName || "N/A"}</span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  list="clinical-doctors-list"
                  placeholder="Dr. Sarah Jenkins (Optometrist)"
                  value={values.doctorName || ""}
                  onChange={(e) => updateField("doctorName", e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <Stethoscope className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <datalist id="clinical-doctors-list">
                  {doctorSuggestions.map((doc, idx) => (
                    <option key={idx} value={doc} />
                  ))}
                </datalist>
              </div>
            )}
          </div>

          {/* PRESCRIPTION DATE */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
              PRESCRIPTION DATE
            </label>
            {readOnly ? (
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{values.prescribedAt || "Today"}</span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="date"
                  value={values.prescribedAt || new Date().toISOString().split("T")[0]}
                  onChange={(e) => updateField("prescribedAt", e.target.value)}
                  className="w-full h-8 pl-7 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-2xs"
                />
                <Calendar className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto mt-1 lg:mt-0">
            <button
              type="button"
              onClick={() => toast.success("Prescription template saved.")}
              className="h-7.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-3 w-3 text-slate-500" />
              <span>Save Rx</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. OPTOMETRY INDUSTRY SMART RECOMMENDATION DATALISTS */}
      {!readOnly && (
        <>
          {/* SPH Datalist: standard diopters from -10.00 to +10.00 */}
          <datalist id="clinical-sph-options">
            <option value="0.00">Plano (0.00)</option>
            <option value="+0.25" />
            <option value="+0.50" />
            <option value="+0.75" />
            <option value="+1.00" />
            <option value="+1.25" />
            <option value="+1.50" />
            <option value="+1.75" />
            <option value="+2.00" />
            <option value="+2.25" />
            <option value="+2.50" />
            <option value="+2.75" />
            <option value="+3.00" />
            <option value="+3.25" />
            <option value="+3.50" />
            <option value="+3.75" />
            <option value="+4.00" />
            <option value="+4.50" />
            <option value="+5.00" />
            <option value="+6.00" />
            <option value="-0.25" />
            <option value="-0.50" />
            <option value="-0.75" />
            <option value="-1.00" />
            <option value="-1.25" />
            <option value="-1.50" />
            <option value="-1.75" />
            <option value="-2.00" />
            <option value="-2.25" />
            <option value="-2.50" />
            <option value="-2.75" />
            <option value="-3.00" />
            <option value="-3.25" />
            <option value="-3.50" />
            <option value="-3.75" />
            <option value="-4.00" />
            <option value="-4.50" />
            <option value="-5.00" />
            <option value="-6.00" />
          </datalist>

          {/* CYL Datalist */}
          <datalist id="clinical-cyl-options">
            <option value="0.00">0.00 (DS)</option>
            <option value="-0.25" />
            <option value="-0.50" />
            <option value="-0.75" />
            <option value="-1.00" />
            <option value="-1.25" />
            <option value="-1.50" />
            <option value="-1.75" />
            <option value="-2.00" />
            <option value="-2.25" />
            <option value="-2.50" />
            <option value="-2.75" />
            <option value="-3.00" />
            <option value="-3.50" />
            <option value="-4.00" />
            <option value="+0.25" />
            <option value="+0.50" />
            <option value="+0.75" />
            <option value="+1.00" />
          </datalist>

          {/* AXIS Datalist */}
          <datalist id="clinical-axis-options">
            <option value="180">180° (Horizontal)</option>
            <option value="90">90° (Vertical)</option>
            <option value="45">45° (Oblique)</option>
            <option value="135">135° (Oblique)</option>
            <option value="175">175°</option>
            <option value="170">170°</option>
            <option value="165">165°</option>
            <option value="160">160°</option>
            <option value="15">15°</option>
            <option value="10">10°</option>
            <option value="5">5°</option>
            <option value="85">85°</option>
            <option value="95">95°</option>
          </datalist>

          {/* ADD Datalist */}
          <datalist id="clinical-add-options">
            <option value="+0.75" />
            <option value="+1.00" />
            <option value="+1.25" />
            <option value="+1.50" />
            <option value="+1.75" />
            <option value="+2.00" />
            <option value="+2.25" />
            <option value="+2.50" />
            <option value="+2.75" />
            <option value="+3.00" />
            <option value="+3.25" />
            <option value="+3.50" />
          </datalist>

          {/* VISION (V/N) Datalist */}
          <datalist id="clinical-vn-options">
            <option value="6/6">6/6 (Standard Perfect)</option>
            <option value="6/6p">6/6p (Partial)</option>
            <option value="6/9">6/9</option>
            <option value="6/9p">6/9p</option>
            <option value="6/12">6/12</option>
            <option value="6/18">6/18</option>
            <option value="6/24">6/24</option>
            <option value="6/36">6/36</option>
            <option value="6/60">6/60</option>
            <option value="N6">N6 (Near Standard)</option>
            <option value="N8">N8</option>
            <option value="N10">N10</option>
            <option value="N12">N12</option>
          </datalist>

          {/* PD Datalist */}
          <datalist id="clinical-pd-options">
            <option value="30.0">30.0 mm</option>
            <option value="30.5">30.5 mm</option>
            <option value="31.0">31.0 mm</option>
            <option value="31.5">31.5 mm (Standard Monocular)</option>
            <option value="32.0">32.0 mm</option>
            <option value="32.5">32.5 mm</option>
            <option value="33.0">33.0 mm</option>
            <option value="33.5">33.5 mm</option>
            <option value="62.0">62.0 mm (Combined Binocular)</option>
            <option value="63.0">63.0 mm</option>
            <option value="64.0">64.0 mm</option>
          </datalist>

          {/* CADD Datalist */}
          <datalist id="clinical-cadd-options">
            <option value="-">- (None)</option>
            <option value="+0.50">+0.50 (Intermediate)</option>
            <option value="+0.75">+0.75</option>
            <option value="+1.00">+1.00</option>
            <option value="+1.25">+1.25</option>
            <option value="+1.50">+1.50</option>
          </datalist>
        </>
      )}
    </div>
  );
}
