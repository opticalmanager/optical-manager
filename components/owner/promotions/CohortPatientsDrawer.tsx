"use client";

import React, { useState, useMemo } from "react";
import { 
  X, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Smartphone, 
  Check, 
  ChevronRight,
  Filter,
  Users,
  Send,
  Sparkles
} from "lucide-react";
import type { SanitizedPatient, GrowthCohortCategory } from "@/types/ai-growth";

interface CohortPatientsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cohortType: GrowthCohortCategory;
  cohortTitle: string;
  badgeLabel: string;
  badgeColor: "blue" | "purple" | "emerald" | "amber" | "indigo" | "rose";
  patients: SanitizedPatient[];
  isLoading?: boolean;
  onLaunchBroadcast: (selectedPatientIds: string[]) => void;
}

export function CohortPatientsDrawer({
  isOpen,
  onClose,
  cohortType,
  cohortTitle,
  badgeLabel,
  badgeColor,
  patients,
  isLoading = false,
  onLaunchBroadcast,
}: CohortPatientsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [antiFatigueShieldActive, setAntiFatigueShieldActive] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Count metrics
  const totalCooldownPatients = useMemo(
    () => patients.filter((p) => p.isRecentlyContacted).length,
    [patients]
  );

  // Initialize selection when patients change
  React.useEffect(() => {
    const initialSelected = new Set<string>();
    for (const p of patients) {
      if (p.isValidWhatsApp) {
        if (antiFatigueShieldActive && p.isRecentlyContacted) {
          // Exclude by default when anti-fatigue shield is active
          continue;
        }
        initialSelected.add(p.id);
      }
    }
    setSelectedIds(initialSelected);
  }, [patients, antiFatigueShieldActive]);

  // Filtered patients based on search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.rawPhone.includes(q)
    );
  }, [patients, searchQuery]);

  const handleToggleSelectAll = () => {
    const reachableInFilter = filteredPatients.filter((p) => {
      if (!p.isValidWhatsApp) return false;
      if (antiFatigueShieldActive && p.isRecentlyContacted) return false;
      return true;
    });

    const allSelected = reachableInFilter.every((p) => selectedIds.has(p.id));

    const next = new Set(selectedIds);
    if (allSelected) {
      // Deselect filtered reachable
      for (const p of reachableInFilter) {
        next.delete(p.id);
      }
    } else {
      // Select all filtered reachable
      for (const p of reachableInFilter) {
        next.add(p.id);
      }
    }
    setSelectedIds(next);
  };

  const handleTogglePatient = (patient: SanitizedPatient) => {
    if (!patient.isValidWhatsApp) return; // Cannot select invalid phones
    const next = new Set(selectedIds);
    if (next.has(patient.id)) {
      next.delete(patient.id);
    } else {
      next.add(patient.id);
    }
    setSelectedIds(next);
  };

  if (!isOpen) return null;

  const badgeColorClasses = {
    blue: "bg-blue-50 text-[#2563eb] border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  }[badgeColor];

  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. DRAWER TOP HEADER */}
        <div className="p-4 border-b border-slate-200/90 flex items-start justify-between gap-3 bg-slate-50/70 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${badgeColorClasses}`}>
                {badgeLabel}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {patients.length} Target Patients Identified
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              {cohortTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review reachable patients, inspect contact cooldowns, and select targets for 1-click WhatsApp dispatch.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. ANTI-FATIGUE SHIELD TOGGLE BANNER */}
        <div className="px-4 py-2.5 bg-amber-50/90 border-b border-amber-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-900">
                14-Day Anti-Fatigue Shield
              </span>
              <span className="text-amber-700 ml-1.5">
                {totalCooldownPatients > 0
                  ? `Protecting ${totalCooldownPatients} patients recently contacted`
                  : "All matched patients are safe to contact"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAntiFatigueShieldActive(!antiFatigueShieldActive)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
              antiFatigueShieldActive
                ? "bg-amber-600 text-white shadow-xs hover:bg-amber-700"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            {antiFatigueShieldActive ? "Shield Active" : "Shield Paused"}
          </button>
        </div>

        {/* 3. SEARCH & SELECTION TOOLBAR */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white shrink-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patient name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Quick Select Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-bold text-slate-600">
              {selectedCount} of {filteredPatients.length} selected
            </span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#2563eb] hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
            >
              Toggle Select All
            </button>
          </div>
        </div>

        {/* 4. HIGH-DENSITY PATIENTS TABLE */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading verified patient records...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No patients match your search filter in this cohort.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 w-8">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-2.5 px-4">Patient Name</th>
                  <th className="py-2.5 px-4">WhatsApp Number</th>
                  <th className="py-2.5 px-4">Spend / Orders</th>
                  <th className="py-2.5 px-4 text-right">Clinical Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => {
                  const isSelected = selectedIds.has(patient.id);
                  const isBlockedByCooldown = antiFatigueShieldActive && patient.isRecentlyContacted;
                  const isInvalid = !patient.isValidWhatsApp;

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => handleTogglePatient(patient)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? "bg-blue-50/40" : ""
                      } ${isInvalid ? "opacity-60 bg-slate-50/30 cursor-not-allowed" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-4 w-8" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isInvalid || isBlockedByCooldown}
                          onChange={() => handleTogglePatient(patient)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      {/* Name & Branch */}
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span>{patient.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {patient.shopName || "Main Branch"}
                          </span>
                        </div>
                      </td>

                      {/* Phone & Status Badge */}
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-slate-700">
                            {patient.phone}
                          </span>

                          {isInvalid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold">
                              <AlertCircle className="w-3 h-3" />
                              Invalid / Landline (Auto-Skipped)
                            </span>
                          ) : patient.isRecentlyContacted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 w-fit">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Contacted {patient.lastContactedDaysAgo ?? 0}d ago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified WhatsApp
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Spend & Orders */}
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">
                            ₹{patient.lifetimeSpend.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {patient.totalOrders} order{patient.totalOrders === 1 ? "" : "s"}
                            {patient.storeCredit > 0 && ` • ₹${patient.storeCredit} Credit`}
                          </span>
                        </div>
                      </td>

                      {/* Clinical Details */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          {patient.lastRightCyl || patient.lastLeftCyl ? (
                            <span className="text-[11px] font-mono text-indigo-700 font-bold">
                              Cyl: {patient.lastRightCyl || "0.00"} / {patient.lastLeftCyl || "0.00"}
                            </span>
                          ) : patient.lastLensType ? (
                            <span className="text-[10px] text-slate-600 font-medium">
                              {patient.lastLensType}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {patient.daysSinceLastVisit !== null 
                                ? `${patient.daysSinceLastVisit}d since visit`
                                : "No visit history"}
                            </span>
                          )}
                          {patient.lastPrescriptionDate && (
                            <span className="text-[9px] text-slate-400">
                              Rx: {new Date(patient.lastPrescriptionDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 5. STICKY ACTION FOOTER */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900">{selectedCount}</span> patients ready for broadcast
            <span className="text-slate-400 block text-[11px]">
              Randomized 3.5s - 6.8s jitter interval applied upon dispatch
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => {
                onLaunchBroadcast(Array.from(selectedIds));
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast ({selectedCount} Patients)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
