"use client";

import React, { useState, useTransition } from "react";
import { 
  X, 
  User, 
  MapPin, 
  Phone, 
  Stethoscope, 
  Calendar, 
  Clock, 
  Edit3, 
  CheckCircle2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppointmentItem } from "@/services/dashboard.service";
import { updateAppointmentStatusAction } from "@/actions/appointment.actions";

interface AppointmentDetailsModalProps {
  appointment: AppointmentItem | null;
  shopName?: string;
  onClose: () => void;
  onStatusUpdated?: (appointmentId: string, newStatus: "COMPLETED" | "CANCELLED" | "CONFIRMED") => void;
}

export function AppointmentDetailsModal({
  appointment,
  shopName = "Vision Plus - Main Store",
  onClose,
  onStatusUpdated,
}: AppointmentDetailsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<"checkin" | "cancel" | null>(null);

  if (!appointment) return null;

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const shortId = appointment.id ? `#OPT-${appointment.id.slice(0, 8).toUpperCase()}` : "#OPT-2023-4589";

  const handleStatusUpdate = (targetStatus: "COMPLETED" | "CANCELLED") => {
    setActionType(targetStatus === "COMPLETED" ? "checkin" : "cancel");
    startTransition(async () => {
      try {
        const res = await updateAppointmentStatusAction(appointment.id, targetStatus);
        if (res.success) {
          onStatusUpdated?.(appointment.id, targetStatus);
          onClose();
        } else {
          alert(res.error || "Failed to update appointment status.");
        }
      } catch (err) {
        console.error("Status update error:", err);
      } finally {
        setActionType(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      {/* Modal Dialog Box */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Section */}
        <div className="p-6 pb-5 border-b border-slate-100 flex items-start justify-between relative bg-white">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[#2563eb] text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm">
              {getInitials(appointment.customerName)}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {appointment.customerName}
                </h2>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  appointment.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : appointment.status === "CANCELLED"
                    ? "bg-rose-50 text-rose-600 border-rose-100"
                    : "bg-blue-50 text-[#2563eb] border-blue-100"
                )}>
                  {appointment.status === "COMPLETED" ? "CHECKED-IN" : appointment.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <span>Appointment ID:</span>
                <span className="font-bold text-slate-600">{shortId}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none cursor-pointer bg-transparent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Fields Grid */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FULL NAME */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                FULL NAME
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-900">
                <User className="h-4 w-4 text-[#2563eb] shrink-0" />
                <span>{appointment.customerName}</span>
              </div>
            </div>

            {/* BRANCH LOCATION */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                BRANCH LOCATION
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-900">
                <MapPin className="h-4 w-4 text-[#2563eb] shrink-0" />
                <span className="truncate">{shopName}</span>
              </div>
            </div>

            {/* PHONE NUMBER */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                PHONE NUMBER
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-900">
                <Phone className="h-4 w-4 text-[#2563eb] shrink-0" />
                <span>{appointment.customerPhone}</span>
              </div>
            </div>

            {/* PURPOSE OF VISIT */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                PURPOSE OF VISIT
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-900">
                <Stethoscope className="h-4 w-4 text-[#2563eb] shrink-0" />
                <span>{appointment.purposeOfVisit || "Eye Examination"}</span>
              </div>
            </div>

            {/* VISIT DATE & TIME */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                VISIT DATE & TIME
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-900">
                <Calendar className="h-4 w-4 text-[#2563eb] shrink-0" />
                <span>{appointment.visitTime}</span>
              </div>
            </div>

            {/* BOOKING REFERENCE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                BOOKING REFERENCE
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-900">
                <Clock className="h-4 w-4 text-[#2563eb] shrink-0" />
                <span>Online Customer Booking</span>
              </div>
            </div>
          </div>

          {/* ADDITIONAL NOTES */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              ADDITIONAL NOTES
            </label>
            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 text-xs font-medium text-slate-700 min-h-[72px] leading-relaxed">
              {appointment.notes || "Patient requested a comprehensive vision checkup & frame styling assistance upon arrival."}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap">
          <Button 
            variant="outline"
            className="h-10 px-4 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer flex items-center gap-2"
            onClick={onClose}
          >
            <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Edit Appointment
          </Button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStatusUpdate("CANCELLED")}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer bg-transparent border-none"
            >
              {isPending && actionType === "cancel" ? "Cancelling..." : "Cancel Visit"}
            </button>

            <Button
              disabled={isPending || appointment.status === "COMPLETED"}
              onClick={() => handleStatusUpdate("COMPLETED")}
              className="h-10 px-5 text-xs font-extrabold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
            >
              {isPending && actionType === "checkin" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" /> Checking In...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" /> Check-in Patient
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
