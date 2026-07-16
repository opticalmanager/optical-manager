"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  Calendar,
  User,
  Phone,
  Clock,
  MapPin,
  MessageSquare,
  FileText,
  GripVertical,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { FormFieldConfig } from "@/db/schema/appointment-configs";
import { saveAppointmentConfigAction } from "@/actions/appointment.actions";

interface ShopOption {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
}

interface AppointmentPageBuilderProps {
  organization: OrganizationInfo;
  shops: ShopOption[];
  initialConfig: {
    formFields?: FormFieldConfig[];
    visitPurposes?: string[];
    pageTitle?: string;
    pageSubtitle?: string;
    primaryColor?: string;
    buttonText?: string;
    isPublished?: boolean;
  };
}

export function AppointmentPageBuilder({
  organization,
  shops,
  initialConfig,
}: AppointmentPageBuilderProps) {
  // State for Form Fields
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(
    initialConfig.formFields || [
      { id: "full_name", label: "Full Name", type: "text", enabled: true, required: true, icon: "user" },
      { id: "phone_number", label: "Phone Number", type: "tel", enabled: true, required: true, icon: "phone" },
      { id: "time_to_visit", label: "Time to Visit", type: "datetime", enabled: true, required: true, icon: "clock" },
      { id: "select_branch", label: "Select Branch", type: "select", enabled: true, required: true, icon: "map-pin" },
      { id: "purpose_of_visit", label: "Purpose of Visit", type: "select", enabled: true, required: true, icon: "message-square" },
      { id: "additional_notes", label: "Additional Notes", type: "textarea", enabled: false, required: false, icon: "file-text" },
    ]
  );

  // State for Purpose of Visit options
  const [visitPurposes, setVisitPurposes] = useState<string[]>(
    initialConfig.visitPurposes || [
      "Eye Test / Vision Check",
      "Contact Lens Consultation",
      "Frame Selection",
    ]
  );

  // Custom Page Settings State
  const [pageTitle, setPageTitle] = useState(
    initialConfig.pageTitle || "Book Your Appointment"
  );
  const [pageSubtitle, setPageSubtitle] = useState(
    initialConfig.pageSubtitle ||
      "Schedule your visit with our experts. We're here to help you see better."
  );
  const [primaryColor, setPrimaryColor] = useState(
    initialConfig.primaryColor || "#2563EB"
  );
  const [buttonText, setButtonText] = useState(
    initialConfig.buttonText || "Book Appointment"
  );

  // Helper / Action UI states
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newOptionText, setNewOptionText] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Dynamic public booking URL
  const publicSlug = organization.slug || "niceroptical";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://opticalmanager.in";
  const publicBookingUrl = `${baseUrl}/book/${publicSlug}`;

  // Toggle field enabled status
  const handleToggleField = (id: string) => {
    setFormFields((prev) =>
      prev.map((field) =>
        field.id === id ? { ...field, enabled: !field.enabled } : field
      )
    );
  };

  // Toggle field required status
  const handleToggleRequired = (id: string) => {
    setFormFields((prev) =>
      prev.map((field) =>
        field.id === id ? { ...field, required: !field.required } : field
      )
    );
  };

  // Add custom purpose of visit option
  const handleAddPurposeOption = () => {
    if (!newOptionText.trim()) return;
    if (visitPurposes.includes(newOptionText.trim())) {
      toast.error("This option already exists.");
      return;
    }
    setVisitPurposes((prev) => [...prev, newOptionText.trim()]);
    setNewOptionText("");
    setIsAddingOption(false);
    toast.success("Option added to Purpose of Visit dropdown.");
  };

  // Delete purpose option
  const handleDeletePurposeOption = (index: number) => {
    if (visitPurposes.length <= 1) {
      toast.error("At least one purpose option is required.");
      return;
    }
    setVisitPurposes((prev) => prev.filter((_, i) => i !== index));
  };

  // Save changes handler
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const res = await saveAppointmentConfigAction({
        formFields,
        visitPurposes,
        pageTitle,
        pageSubtitle,
        primaryColor,
        buttonText,
      });

      if (res.success) {
        toast.success(res.message || "Appointment page updated!");
      } else {
        toast.error(res.error || "Failed to save changes.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Copy live URL to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicBookingUrl);
    setCopiedLink(true);
    toast.success("Public booking link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Render icon helper for form fields
  const renderFieldIcon = (iconName?: string) => {
    switch (iconName) {
      case "user":
        return <User className="w-4 h-4 text-slate-400" />;
      case "phone":
        return <Phone className="w-4 h-4 text-slate-400" />;
      case "clock":
        return <Clock className="w-4 h-4 text-slate-400" />;
      case "map-pin":
        return <MapPin className="w-4 h-4 text-slate-400" />;
      case "message-square":
        return <MessageSquare className="w-4 h-4 text-slate-400" />;
      case "file-text":
        return <FileText className="w-4 h-4 text-slate-400" />;
      default:
        return <Calendar className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/owner/settings"
            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-snug">
              Appointment Page
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Create and customize your appointment booking page.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={publicBookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-xs transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </a>

          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </header>

      {/* Main Split Screen Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Configuration Controls */}
        <div className="w-full lg:w-96 xl:w-[420px] bg-white border-r border-slate-200/80 p-6 overflow-y-auto space-y-8 shrink-0">
          
          {/* SECTION 1: Form Fields */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>1. Form Fields</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the fields you want to collect from your customers.
              </p>
            </div>

            <div className="space-y-2.5">
              {formFields.map((field) => (
                <div
                  key={field.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    field.enabled
                      ? "bg-white border-slate-200 shadow-xs"
                      : "bg-slate-50/70 border-slate-100 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0 cursor-grab" />
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {renderFieldIcon(field.icon)}
                    </div>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {field.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRequired(field.id)}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                        field.required
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
                      }`}
                    >
                      {field.required ? "REQUIRED" : "OPTIONAL"}
                    </button>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleField(field.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        field.enabled ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          field.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => toast.info("Standard form fields are fully optimized for optical bookings.")}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* SECTION 2: Purpose of Visit Options */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Purpose of Visit Options
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage the options for the purpose of visit field.
              </p>
            </div>

            <div className="space-y-2">
              {visitPurposes.map((option, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">
                      {option}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePurposeOption(idx)}
                    className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {isAddingOption ? (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Eyewear Repair & Adjustment"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPurposeOption()}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleAddPurposeOption}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingOption(false)}
                  className="px-2.5 py-1.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingOption(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* SECTION 3: Page Settings */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                3. Page Settings
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize the look and feel of your appointment page.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  PAGE TITLE
                </label>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  SUBTITLE
                </label>
                <textarea
                  rows={3}
                  value={pageSubtitle}
                  onChange={(e) => setPageSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    PRIMARY COLOR
                  </label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1.5 bg-white">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    BUTTON TEXT
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Preview Panel */}
        <div className="flex-1 bg-slate-100/70 p-6 lg:p-10 overflow-y-auto flex flex-col items-center">
          
          {/* Live URL Header Box matching Screenshot */}
          <div className="w-full max-w-2xl mb-6 flex items-center justify-between gap-4 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-slate-800 shrink-0">Live URL</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="text-xs font-mono text-slate-500 truncate">
                {publicBookingUrl}
              </span>
            </div>

            <button
              onClick={handleCopyLink}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Copy URL"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Live Phone / Mock Frame Card Preview */}
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col">
            
            {/* Header Banner with Primary Color */}
            <div
              style={{ backgroundColor: primaryColor }}
              className="px-8 py-6 text-white flex items-center justify-between transition-colors duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-lg">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight leading-snug">
                    {organization.name}
                  </h3>
                  <span className="text-[10px] text-white/80 font-medium uppercase tracking-wider">
                    OPTICALS
                  </span>
                </div>
              </div>

              <div className="text-xs font-bold flex items-center gap-1.5 text-white/90">
                <Phone className="w-3.5 h-3.5" />
                <span>{organization.phone || "+91 98765 43210"}</span>
              </div>
            </div>

            {/* Mock Booking Form Container */}
            <div className="p-8 space-y-6">
              
              {/* Form Title & Subtitle Header */}
              <div className="text-center space-y-2 max-w-md mx-auto">
                <div
                  style={{ color: primaryColor }}
                  className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 mx-auto flex items-center justify-center"
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

              {/* Mock Input Fields */}
              <div className="space-y-4 max-w-md mx-auto pt-2">
                {formFields.find((f) => f.id === "full_name")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Full Name {formFields.find((f) => f.id === "full_name")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        disabled
                        type="text"
                        placeholder="Enter your full name"
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {formFields.find((f) => f.id === "phone_number")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Phone Number {formFields.find((f) => f.id === "phone_number")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        disabled
                        type="tel"
                        placeholder="Enter your phone number"
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {formFields.find((f) => f.id === "time_to_visit")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Time to Visit {formFields.find((f) => f.id === "time_to_visit")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        disabled
                        type="text"
                        placeholder="Select date and time"
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-400"
                      />
                      <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    </div>
                  </div>
                )}

                {formFields.find((f) => f.id === "select_branch")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Select Branch {formFields.find((f) => f.id === "select_branch")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <select
                        disabled
                        className="w-full pl-3.5 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-700 appearance-none"
                      >
                        <option>Select preferred branch</option>
                        {shops.map((shop) => (
                          <option key={shop.id}>{shop.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formFields.find((f) => f.id === "purpose_of_visit")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Purpose of Visit {formFields.find((f) => f.id === "purpose_of_visit")?.required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <select
                        disabled
                        className="w-full pl-3.5 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-700 appearance-none"
                      >
                        <option>Select purpose of visit</option>
                        {visitPurposes.map((purpose, idx) => (
                          <option key={idx}>{purpose}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formFields.find((f) => f.id === "additional_notes")?.enabled && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      disabled
                      rows={3}
                      placeholder="Enter any specific requests or notes for your visit..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-400 resize-none"
                    ></textarea>
                  </div>
                )}

                {/* Submit CTA Button */}
                <button
                  disabled
                  style={{ backgroundColor: primaryColor }}
                  className="w-full py-3 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all mt-2 cursor-default"
                >
                  <Calendar className="w-4 h-4 text-white" />
                  <span>{buttonText}</span>
                </button>

                <p className="text-[10px] text-slate-400 text-center font-medium flex items-center justify-center gap-1 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Your information is safe and secure</span>
                </p>
              </div>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
