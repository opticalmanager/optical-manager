"use client";

import React, { useState, useEffect, useTransition } from "react";
import { X, User, Phone, Calendar, Clock, Stethoscope, FileText, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createShopAppointmentAction } from "@/actions/appointment.actions";
import { offlineDB } from "@/lib/offline/db";
import { enqueueOfflineMutation } from "@/lib/offline/mutation-queue";
import { useOffline } from "@/components/providers/OfflineProvider";

interface NewAppointmentModalProps {
  isOpen: boolean;
  initialDate?: string;
  onClose: () => void;
  onSuccess?: (createdApp?: any) => void;
}

const defaultPurposes = [
  "Eye Test / Vision Check",
  "Contact Lens Consultation",
  "Frame Selection",
  "Lens Trial & Fitting",
  "Follow-up Checkup",
];

export function NewAppointmentModal({ isOpen, initialDate, onClose, onSuccess }: NewAppointmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const { isOnline, shopId: contextShopId } = useOffline();

  const todayStr = new Date().toISOString().split("T")[0];

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [visitDate, setVisitDate] = useState(initialDate && initialDate >= todayStr ? initialDate : todayStr);
  const [visitTime, setVisitTime] = useState("10:30");
  const [purposeOfVisit, setPurposeOfVisit] = useState(defaultPurposes[0]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Reset form inputs whenever modal opens or initialDate changes
  useEffect(() => {
    if (isOpen) {
      setCustomerName("");
      setCustomerPhone("");
      setVisitDate(initialDate && initialDate >= todayStr ? initialDate : todayStr);
      setVisitTime("10:30");
      setPurposeOfVisit(defaultPurposes[0]);
      setAdditionalNotes("");
      setErrorMsg("");
    }
  }, [isOpen, initialDate, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg("Please provide patient name and phone number.");
      return;
    }

    if (customerPhone.trim().length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!visitDate) {
      setErrorMsg("Please select a visit date.");
      return;
    }

    // Format 12-hour time for UI display
    const [hours, minutes] = visitTime.split(":").map(Number);
    const dateObj = new Date(visitDate);
    dateObj.setHours(hours || 10, minutes || 0, 0, 0);
    const formattedTime = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const fullDateTimeStr = `${visitDate}T${visitTime}:00`;

    startTransition(async () => {
      const activeShopId =
        contextShopId ||
        (typeof window !== "undefined"
          ? localStorage.getItem("om_active_shop_id") || "active_shop"
          : "active_shop");
      const isOffline = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

      if (isOffline) {
        const offlineAppId = `off-app-${Date.now()}`;

        const offlineApp = {
          id: offlineAppId,
          shopId: activeShopId,
          organizationId: "offline_org",
          customerId: null,
          patientName: customerName.trim(),
          patientPhone: customerPhone.trim(),
          appointmentDate: visitDate,
          appointmentTime: formattedTime,
          status: "CONFIRMED" as const,
          type: purposeOfVisit,
          notes: additionalNotes.trim(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await offlineDB.cached_appointments.put(offlineApp);
          await enqueueOfflineMutation(activeShopId, "APPOINTMENT_CREATE", {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            visitTime: fullDateTimeStr,
            purposeOfVisit,
            additionalNotes: additionalNotes.trim(),
          });

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("offline-databank-updated", {
                detail: { shopId: activeShopId, timestamp: new Date().toISOString() },
              })
            );
          }

          onSuccess?.({
            id: offlineAppId,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            visitTime: formattedTime,
            rawVisitTime: fullDateTimeStr,
            dateKey: visitDate,
            purposeOfVisit,
            status: "CONFIRMED",
            notes: additionalNotes.trim(),
          });
          onClose();
        } catch (err: any) {
          console.error("Failed to save offline appointment:", err);
          setErrorMsg("Failed to save appointment locally.");
        }
        return;
      }

      try {
        const res = await createShopAppointmentAction({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          visitTime: fullDateTimeStr,
          purposeOfVisit,
          additionalNotes: additionalNotes.trim(),
        });

        if (res.success && res.data) {
          onSuccess?.(res.data);
          onClose();
        } else {
          setErrorMsg(res.error || "Failed to schedule appointment.");
        }
      } catch (err) {
        // Fallback: If network dropped during submission, save offline
        try {
          const offlineAppId = `off-app-${Date.now()}`;

          const offlineApp = {
            id: offlineAppId,
            shopId: activeShopId,
            organizationId: "offline_org",
            customerId: null,
            patientName: customerName.trim(),
            patientPhone: customerPhone.trim(),
            appointmentDate: visitDate,
            appointmentTime: formattedTime,
            status: "CONFIRMED" as const,
            type: purposeOfVisit,
            notes: additionalNotes.trim(),
            updatedAt: new Date().toISOString(),
          };

          await offlineDB.cached_appointments.put(offlineApp);
          await enqueueOfflineMutation(activeShopId, "APPOINTMENT_CREATE", {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            visitTime: fullDateTimeStr,
            purposeOfVisit,
            additionalNotes: additionalNotes.trim(),
          });

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("offline-databank-updated", {
                detail: { shopId: activeShopId, timestamp: new Date().toISOString() },
              })
            );
          }

          onSuccess?.({
            id: offlineAppId,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            visitTime: formattedTime,
            rawVisitTime: fullDateTimeStr,
            dateKey: visitDate,
            purposeOfVisit,
            status: "CONFIRMED",
            notes: additionalNotes.trim(),
          });
          onClose();
          return;
        } catch (localErr) {
          console.error("New appointment submission error:", err);
          setErrorMsg("An unexpected error occurred.");
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-xl">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                New Appointment
              </h2>
              <p className="text-xs text-slate-400 font-semibold">
                Schedule a patient visit for this store branch.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors border-none cursor-pointer bg-transparent"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600">
              {errorMsg}
            </div>
          )}

          {/* Patient Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Patient Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                inputMode="numeric"
                required
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setCustomerPhone(val);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Visit Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="time"
                  required
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                />
              </div>
            </div>
          </div>

          {/* Purpose of Visit */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Purpose of Visit
            </label>
            <div className="relative">
              <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={purposeOfVisit}
                onChange={(e) => setPurposeOfVisit(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              >
                {defaultPurposes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Additional Notes
            </label>
            <textarea
              rows={2}
              placeholder="Any specific requests or optometrist notes..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 text-xs font-bold text-slate-600 border-slate-200 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 px-5 text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white mr-2" /> Booking...
                </>
              ) : (
                "Schedule Appointment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
