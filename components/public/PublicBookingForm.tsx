"use client";

import React, { useState } from "react";
import {
  Calendar,
  User,
  Phone,
  Clock,
  MapPin,
  MessageSquare,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Store,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { FormFieldConfig } from "@/db/schema/appointment-configs";
import { submitAppointmentAction } from "@/actions/appointment.actions";

interface ShopItem {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

interface PublicBookingFormProps {
  organization: {
    id: string;
    name: string;
    slug: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    logoUrl?: string | null;
  };
  shops: ShopItem[];
  config: {
    formFields?: FormFieldConfig[];
    visitPurposes?: string[];
    pageTitle?: string;
    pageSubtitle?: string;
    primaryColor?: string;
    buttonText?: string;
  };
}

export function PublicBookingForm({
  organization,
  shops,
  config,
}: PublicBookingFormProps) {
  // Extract configuration or fallbacks
  const fields = config.formFields || [
    { id: "full_name", label: "Full Name", type: "text", enabled: true, required: true },
    { id: "phone_number", label: "Phone Number", type: "tel", enabled: true, required: true },
    { id: "time_to_visit", label: "Time to Visit", type: "datetime", enabled: true, required: true },
    { id: "select_branch", label: "Select Branch", type: "select", enabled: true, required: true },
    { id: "purpose_of_visit", label: "Purpose of Visit", type: "select", enabled: true, required: true },
    { id: "additional_notes", label: "Additional Notes", type: "textarea", enabled: false, required: false },
  ];

  const purposes = config.visitPurposes || [
    "Eye Test / Vision Check",
    "Contact Lens Consultation",
    "Frame Selection",
  ];

  const primaryColor = config.primaryColor || "#2563EB";
  const pageTitle = config.pageTitle || "Book Your Appointment";
  const pageSubtitle =
    config.pageSubtitle ||
    "Schedule your visit with our experts. We're here to help you see better.";
  const buttonText = config.buttonText || "Book Appointment";

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [selectedShopId, setSelectedShopId] = useState(
    shops.length > 0 ? shops[0].id : ""
  );
  const [purposeOfVisit, setPurposeOfVisit] = useState(
    purposes.length > 0 ? purposes[0] : "Vision Examination"
  );
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShopId) {
      toast.error("Please select a store branch location.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Full Name and Phone Number are required.");
      return;
    }

    if (!visitTime) {
      toast.error("Please select a date and time for your visit.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitAppointmentAction({
        organizationId: organization.id,
        shopId: selectedShopId,
        customerName,
        customerPhone,
        visitTime,
        purposeOfVisit,
        additionalNotes,
      });

      if (res.success) {
        setIsSuccess(true);
        toast.success("Appointment booked successfully!");
      } else {
        toast.error(res.error || "Failed to book appointment.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 sm:py-12 px-4 font-sans">
      
      {/* Container Box */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div
          style={{ backgroundColor: primaryColor }}
          className="px-8 py-6 text-white flex items-center justify-between transition-colors duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-snug">
                {organization.name}
              </h1>
              <span className="text-[10px] text-white/80 font-medium uppercase tracking-wider block">
                OPTICAL CARE
              </span>
            </div>
          </div>

          {organization.phone && (
            <a
              href={`tel:${organization.phone}`}
              className="text-xs font-bold flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{organization.phone}</span>
            </a>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-10 space-y-6">
          {isSuccess ? (
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-slate-900">
                Appointment Scheduled!
              </h2>

              <p className="text-sm font-medium text-slate-600 max-w-sm mx-auto leading-relaxed">
                Thank you, <strong className="text-slate-900">{customerName}</strong>! Your appointment has been sent to our outlet staff. We look forward to seeing you.
              </p>

              <div className="pt-4 border-t border-slate-100 max-w-sm mx-auto text-left space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Selected Store:</span>
                  <span className="font-bold text-slate-800">
                    {shops.find((s) => s.id === selectedShopId)?.name || "Main Branch"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Scheduled Time:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(visitTime).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Purpose:</span>
                  <span className="font-bold text-slate-800">{purposeOfVisit}</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setIsSuccess(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Form Title & Subtitle Header */}
              <div className="text-center space-y-2 max-w-md mx-auto">
                <div
                  style={{ color: primaryColor }}
                  className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 mx-auto flex items-center justify-center shadow-xs"
                >
                  <Calendar className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {pageTitle}
                </h2>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  {pageSubtitle}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto pt-2">
                {/* Dynamic Fields */}
                {fields.find((f) => f.id === "full_name")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Full Name {fields.find((f) => f.id === "full_name")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required={fields.find((f) => f.id === "full_name")?.required}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                      />
                    </div>
                  </div>
                )}

                {fields.find((f) => f.id === "phone_number")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Phone Number {fields.find((f) => f.id === "phone_number")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required={fields.find((f) => f.id === "phone_number")?.required}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                      />
                    </div>
                  </div>
                )}

                {fields.find((f) => f.id === "time_to_visit")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Time to Visit {fields.find((f) => f.id === "time_to_visit")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="datetime-local"
                        required={fields.find((f) => f.id === "time_to_visit")?.required}
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                      />
                    </div>
                  </div>
                )}

                {fields.find((f) => f.id === "select_branch")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Select Branch {fields.find((f) => f.id === "select_branch")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <select
                        required={fields.find((f) => f.id === "select_branch")?.required}
                        value={selectedShopId}
                        onChange={(e) => setSelectedShopId(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                      >
                        {shops.map((shop) => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name} {shop.address ? `(${shop.address})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {fields.find((f) => f.id === "purpose_of_visit")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Purpose of Visit {fields.find((f) => f.id === "purpose_of_visit")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <select
                        required={fields.find((f) => f.id === "purpose_of_visit")?.required}
                        value={purposeOfVisit}
                        onChange={(e) => setPurposeOfVisit(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                      >
                        {purposes.map((p, idx) => (
                          <option key={idx} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {fields.find((f) => f.id === "additional_notes")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Enter any specific requests or notes for your visit..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none shadow-xs"
                    ></textarea>
                  </div>
                )}

                {/* Submit CTA Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full py-3 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 hover:opacity-95 transition-all mt-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Calendar className="w-4 h-4 text-white" />
                  )}
                  <span>{buttonText}</span>
                </button>

                <p className="text-[10px] text-slate-400 text-center font-medium flex items-center justify-center gap-1 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Your information is safe and secure</span>
                </p>
              </form>

              {/* Trust Badges Footer Grid */}
              <div className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-800">Trusted Care</h4>
                  <p className="text-[9px] text-slate-400 leading-tight">Experienced optometrists you can trust</p>
                </div>

                <div className="space-y-1">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-800">Quick & Easy</h4>
                  <p className="text-[9px] text-slate-400 leading-tight">Book in just a few simple steps</p>
                </div>

                <div className="space-y-1">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-800">Multiple Locations</h4>
                  <p className="text-[9px] text-slate-400 leading-tight">Visit us at a store near you</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
