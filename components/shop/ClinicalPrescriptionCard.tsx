"use client";

import React, { useState } from "react";
import { Eye, Plus, Calendar, Stethoscope, ChevronDown, Check, Download, RotateCcw } from "lucide-react";
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

export interface PastRxItem {
  id: string;
  date: string;
  doctor?: string;
  rxNumber?: string;
  lensType?: string;
  label?: string;
  shortLabel?: string;
}

export interface ClinicalPrescriptionCardProps {
  values: ClinicalPrescriptionValues;
  onChange?: (updated: ClinicalPrescriptionValues) => void;
  doctorSuggestions?: string[];
  readOnly?: boolean;
  className?: string;
  onClear?: () => void;
  hideDoctor?: boolean;
  pastRxList?: PastRxItem[];
  selectedPastRxId?: string;
  onSelectPastRx?: (id: string) => void;
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
  hideDoctor = false,
  pastRxList = [],
  selectedPastRxId,
  onSelectPastRx,
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
      className={`bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* 1. COMPACT CLINICAL HEADER */}
      <div className="py-1.5 px-3 bg-slate-50 border-b border-slate-300 rounded-t-lg flex flex-wrap items-center justify-between gap-2">
        {/* Left Title & Badge */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563eb]">
            <Eye className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
            SPECT(S) RX / CLINICAL PRESCRIPTION
          </h3>
          <span className="bg-blue-50 text-[#2563eb] border border-blue-300 px-1.5 py-0.2 rounded text-[10px] font-bold tracking-tight shadow-2xs">
            Rx #{rxDisplayNum}
          </span>
        </div>

        {/* Right Side: Historical Prescription Selector (Date-wise, compact) */}
        {pastRxList && pastRxList.length > 0 ? (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
              <RotateCcw className="w-3 h-3 text-[#2563eb]" />
              <span className="hidden sm:inline">Past Rx:</span>
            </span>
            <div className="relative">
              <select
                value={selectedPastRxId || ""}
                onChange={(e) => onSelectPastRx && onSelectPastRx(e.target.value)}
                className="h-6.5 pl-2 pr-6 rounded border border-slate-300 bg-white text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563eb] appearance-none cursor-pointer transition-all shadow-2xs max-w-[200px] truncate hover:border-slate-400"
                title="Select historical prescription"
              >
                {pastRxList.map((g, idx) => (
                  <option key={g.id} value={g.id}>
                    {idx === 0 ? "★ " : `#${idx + 1} `}{g.shortLabel || g.date || g.label}
                  </option>
                ))}
                <option value="NEW_BLANK">+ Blank / Fresh Exam</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
            <span
              className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-100 text-[#0a52c3] border border-blue-200"
              title={`${pastRxList.length} past prescriptions recorded`}
            >
              {pastRxList.length}
            </span>
          </div>
        ) : !hideDoctor ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Dr:</span>
            {readOnly ? (
              <span className="text-xs font-bold text-slate-800">{values.doctorName || "N/A"}</span>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  list="clinical-doctors-list"
                  value={values.doctorName || ""}
                  onChange={(e) => updateField("doctorName", e.target.value)}
                  placeholder="Doctor name"
                  className="h-6.5 pl-6 pr-2 rounded border border-slate-300 bg-white text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-all hover:border-slate-400"
                />
                <Stethoscope className="absolute left-1.5 top-1.5 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* SUBHEADER: TABS ON LEFT | LENS TYPE, DATE, SAVE RX SHIFTED TO RIGHT */}
      <div className="py-1 px-2.5 bg-slate-50/60 border-b border-slate-300 flex flex-wrap items-center justify-between gap-1.5">
        {/* Left: Tab Pills & Quick Actions */}
        {!readOnly ? (
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-300 text-[10.5px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("SPECTACLES");
                  setRxCategory("SPECTACLES");
                  updateField("rxCategory", "SPECTACLES");
                }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === "SPECTACLES"
                    ? "bg-[#2563eb] text-white shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
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
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === "CONTACT_LENS"
                    ? "bg-[#2563eb] text-white shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
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
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === "DISTANCE"
                    ? "bg-[#2563eb] text-white shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
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
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === "NEAR"
                    ? "bg-[#2563eb] text-white shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Near
              </button>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10.5px] font-bold text-[#2563eb] bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
              title="Clear / New Prescription Blank"
            >
              <Plus className="w-3 h-3" />
              <span>New Rx</span>
            </button>
          </div>
        ) : (
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Clinical Refraction</div>
        )}

        {/* Right: Lens Type + Prescription Date + Save Rx */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Lens Type */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Lens:</span>
            {readOnly ? (
              <span className="text-xs font-bold text-slate-800">{values.lensType || "Single Vision"}</span>
            ) : (
              <div className="relative">
                <select
                  value={values.lensType || "Single Vision"}
                  onChange={(e) => updateField("lensType", e.target.value)}
                  className="h-6.5 pl-2 pr-5 rounded border border-slate-300 bg-white text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] appearance-none cursor-pointer transition-all shadow-2xs hover:border-slate-400"
                >
                  {STANDARD_LENS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1 top-2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Prescription Date */}
          <div className="flex items-center gap-1">
            {readOnly ? (
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{values.prescribedAt || "Today"}</span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="date"
                  value={values.prescribedAt || new Date().toISOString().split("T")[0]}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => updateField("prescribedAt", e.target.value)}
                  className="h-6.5 pl-5 pr-1 rounded border border-slate-300 bg-white text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs hover:border-slate-400"
                />
                <Calendar className="absolute left-1 top-1.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Save Rx */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => toast.success("Prescription template saved.")}
              className="h-6.5 px-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[10.5px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 transition-colors cursor-pointer hover:border-slate-400"
              title="Save Rx"
            >
              <Download className="h-3 w-3 text-slate-500" />
              <span>Save Rx</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. HIGH-DENSITY INDUSTRIAL RX TABLE (NO HORIZONTAL SCROLL) */}
      <div className="p-2 overflow-hidden">
        <table className="w-full text-center border-collapse table-fixed">
          <colgroup>
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider bg-slate-50/50">
              <th className="py-1 px-0.5 text-center">EYE</th>
              <th className="py-1 px-0.5">SPHL. (SPH)</th>
              <th className="py-1 px-0.5">CYL. (CYL)</th>
              <th className="py-1 px-0.5">AXIS (°)</th>
              <th className="py-1 px-0.5 text-[#2563eb]">ADDN. (ADD)</th>
              <th className="py-1 px-0.5">VISION (V/N)</th>
              <th className="py-1 px-0.5">P.D. (MM)</th>
              <th className="py-1 px-0.5">CADD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-bold">
            {/* ROW 1: RIGHT EYE (OD) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-0.5 px-0.5 text-center">
                <div className="flex items-center justify-center gap-1 bg-blue-50/70 border border-blue-200/80 rounded h-7 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] shrink-0" />
                  <span className="font-black text-[#2563eb] text-xs">RE</span>
                  <span className="text-[9px] text-slate-400 font-bold hidden sm:inline">(OD)</span>
                </div>
              </td>
              {/* SPH */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.rightSphere || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-sph-options"
                    value={values.rightSphere || ""}
                    onChange={(e) => updateField("rightSphere", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("rightSphere", e.target.value)}
                    placeholder="0.00"
                    className="w-full h-7 text-center font-bold text-xs text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* CYL */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.rightCylinder || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-cyl-options"
                    value={values.rightCylinder || ""}
                    onChange={(e) => updateField("rightCylinder", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("rightCylinder", e.target.value)}
                    placeholder="0.00"
                    className="w-full h-7 text-center font-bold text-xs text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* AXIS */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.rightAxis ? `${values.rightAxis}°` : "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-axis-options"
                    value={values.rightAxis || ""}
                    onChange={(e) => updateField("rightAxis", e.target.value)}
                    onBlur={(e) => handleBlurAxis("rightAxis", e.target.value)}
                    placeholder="180"
                    className="w-full h-7 text-center font-bold text-xs text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* ADDN (ADD) */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="inline-block px-1.5 py-0.5 bg-blue-50/80 text-[#2563eb] font-extrabold rounded border border-blue-200/60">
                    {values.rightAdd || "-"}
                  </span>
                ) : (
                  <input
                    type="text"
                    list="clinical-add-options"
                    value={values.rightAdd || ""}
                    onChange={(e) => updateField("rightAdd", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("rightAdd", e.target.value)}
                    placeholder="+2.00"
                    className="w-full h-7 text-center font-extrabold text-xs text-[#2563eb] bg-blue-50/60 border border-blue-200/90 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-blue-300"
                  />
                )}
              </td>
              {/* VISION (V/N) */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-semibold text-slate-700">{values.rightNv || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-vn-options"
                    value={values.rightNv || ""}
                    onChange={(e) => updateField("rightNv", e.target.value)}
                    placeholder="6/6"
                    className="w-full h-7 text-center font-semibold text-xs text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* P.D. (MM) */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-semibold text-slate-700">{values.pdRight ? `${values.pdRight}` : "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-pd-options"
                    value={values.pdRight || ""}
                    onChange={(e) => updateField("pdRight", e.target.value)}
                    placeholder="31.5"
                    className="w-full h-7 text-center font-semibold text-xs text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* CADD */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="text-slate-400 font-medium">{values.caddRight || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-cadd-options"
                    value={values.caddRight || ""}
                    onChange={(e) => updateField("caddRight", e.target.value)}
                    placeholder="-"
                    className="w-full h-7 text-center text-xs text-slate-600 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
            </tr>

            {/* ROW 2: LEFT EYE (OS) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-0.5 px-0.5 text-center">
                <div className="flex items-center justify-center gap-1 bg-emerald-50/70 border border-emerald-200/80 rounded h-7 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span className="font-black text-emerald-700 text-xs">LE</span>
                  <span className="text-[9px] text-slate-400 font-bold hidden sm:inline">(OS)</span>
                </div>
              </td>
              {/* SPH */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.leftSphere || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-sph-options"
                    value={values.leftSphere || ""}
                    onChange={(e) => updateField("leftSphere", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("leftSphere", e.target.value)}
                    placeholder="0.00"
                    className="w-full h-7 text-center font-bold text-xs text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* CYL */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.leftCylinder || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-cyl-options"
                    value={values.leftCylinder || ""}
                    onChange={(e) => updateField("leftCylinder", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("leftCylinder", e.target.value)}
                    placeholder="0.00"
                    className="w-full h-7 text-center font-bold text-xs text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* AXIS */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-bold text-slate-800">{values.leftAxis ? `${values.leftAxis}°` : "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-axis-options"
                    value={values.leftAxis || ""}
                    onChange={(e) => updateField("leftAxis", e.target.value)}
                    onBlur={(e) => handleBlurAxis("leftAxis", e.target.value)}
                    placeholder="180"
                    className="w-full h-7 text-center font-bold text-xs text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* ADDN (ADD) */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="inline-block px-1.5 py-0.5 bg-blue-50/80 text-[#2563eb] font-extrabold rounded border border-blue-200/60">
                    {values.leftAdd || "-"}
                  </span>
                ) : (
                  <input
                    type="text"
                    list="clinical-add-options"
                    value={values.leftAdd || ""}
                    onChange={(e) => updateField("leftAdd", e.target.value)}
                    onBlur={(e) => handleBlurDiopter("leftAdd", e.target.value)}
                    placeholder="+2.00"
                    className="w-full h-7 text-center font-extrabold text-xs text-[#2563eb] bg-blue-50/60 border border-blue-200/90 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-blue-300"
                  />
                )}
              </td>
              {/* VISION (V/N) */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-semibold text-slate-700">{values.leftNv || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-vn-options"
                    value={values.leftNv || ""}
                    onChange={(e) => updateField("leftNv", e.target.value)}
                    placeholder="6/6"
                    className="w-full h-7 text-center font-semibold text-xs text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* P.D. (MM) */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="font-semibold text-slate-700">{values.pdLeft ? `${values.pdLeft}` : "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-pd-options"
                    value={values.pdLeft || ""}
                    onChange={(e) => updateField("pdLeft", e.target.value)}
                    placeholder="31.5"
                    className="w-full h-7 text-center font-semibold text-xs text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
              {/* CADD */}
              <td className="py-0.5 px-0.5">
                {readOnly ? (
                  <span className="text-slate-400 font-medium">{values.caddLeft || "-"}</span>
                ) : (
                  <input
                    type="text"
                    list="clinical-cadd-options"
                    value={values.caddLeft || ""}
                    onChange={(e) => updateField("caddLeft", e.target.value)}
                    placeholder="-"
                    className="w-full h-7 text-center text-xs text-slate-600 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] transition-all shadow-2xs placeholder:text-slate-300"
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>
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
