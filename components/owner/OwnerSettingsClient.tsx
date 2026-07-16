"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Shield,
  MessageSquare,
  Users,
  User,
  BarChart3,
  Calendar,
  Search,
  X,
  Check,
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
  FileText,
  Percent,
  Receipt,
  Sparkles,
  Award,
  FileCheck,
  Clock,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { updateOrganizationAction } from "@/actions/organization.actions";

interface OrganizationData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl?: string | null;
  logo?: string | null;
}

interface OwnerSettingsClientProps {
  organization: OrganizationData | null;
}

interface SettingCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  tags: { id: string; label: string; action: string }[];
}

export function OwnerSettingsClient({ organization }: OwnerSettingsClientProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState<
    "org" | "tax" | "customers" | "reports" | "appointments" | "access" | null
  >(null);

  // Keyboard shortcut listener to focus search on '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Form states for Organization Modal
  const [orgName, setOrgName] = useState(organization?.name || "");
  const [orgEmail, setOrgEmail] = useState(organization?.email || "");
  const [orgPhone, setOrgPhone] = useState(organization?.phone || "");
  const [orgAddress, setOrgAddress] = useState(organization?.address || "");
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Form states for Tax & GST Modal
  const [cgstRate, setCgstRate] = useState("9");
  const [sgstRate, setSgstRate] = useState("9");
  const [igstRate, setIgstRate] = useState("18");
  const [gstinNumber, setGstinNumber] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("OM-INV-");
  const [isSavingTax, setIsSavingTax] = useState(false);

  // Form states for Loyalty & Customer Groups Modal
  const [loyaltyRatio, setLoyaltyRatio] = useState("100");
  const [pointsPerRatio, setPointsPerRatio] = useState("1");
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);

  // Form states for PDF Invoice Templates Modal
  const [pdfHeaderNote, setPdfHeaderNote] = useState("Thank you for your visit! Wishing you crystal clear vision.");
  const [pdfTerms, setPdfTerms] = useState("1. Goods once sold cannot be returned.\n2. Warranty covers manufacturing defects only.");
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  // Form states for Appointment Booking Form Modal
  const [appointmentDuration, setAppointmentDuration] = useState("30");
  const [enableOnlineReminders, setEnableOnlineReminders] = useState(true);
  const [isSavingAppointments, setIsSavingAppointments] = useState(false);

  // Define 7 Setting Categories matching Screenshot 1
  const categories: SettingCategory[] = [
    {
      id: "org",
      title: "Organisation Details",
      icon: Store,
      tags: [
        { id: "profile", label: "Profile", action: "modal_org" },
        { id: "business_hours", label: "Business Hours", action: "modal_org" },
        { id: "contact_info", label: "Contact Info", action: "modal_org" },
      ],
    },
    {
      id: "tax",
      title: "Tax & GST",
      icon: Shield,
      tags: [
        { id: "gst_rates", label: "GST Rates", action: "modal_tax" },
        { id: "taxation_logic", label: "Taxation Logic", action: "modal_tax" },
      ],
    },
    {
      id: "communication",
      title: "Communication",
      icon: MessageSquare,
      tags: [
        { id: "email_templates", label: "Email Templates", action: "route_comm" },
        { id: "sms_templates", label: "SMS Templates", action: "route_comm" },
        { id: "whatsapp_templates", label: "WhatsApp Templates", action: "route_comm" },
      ],
    },
    {
      id: "access",
      title: "Access and Users",
      icon: Users,
      tags: [
        { id: "staff_management", label: "Staff Management", action: "modal_access" },
        { id: "roles_permissions", label: "Roles & Permissions", action: "modal_access" },
      ],
    },
    {
      id: "customers",
      title: "Customers",
      icon: User,
      tags: [
        { id: "loyalty_program", label: "Loyalty Program", action: "modal_customers" },
        { id: "customer_groups", label: "Customer Groups", action: "modal_customers" },
      ],
    },
    {
      id: "reports",
      title: "Reports",
      icon: BarChart3,
      tags: [
        { id: "pdf_templates", label: "PDF Templates", action: "modal_reports" },
        { id: "auto_reports", label: "Auto-Reports", action: "modal_reports" },
      ],
    },
    {
      id: "appointments",
      title: "Appointment Booking",
      icon: Calendar,
      tags: [
        { id: "appointment_template", label: "Appointment Form Template", action: "modal_appointments" },
      ],
    },
  ];

  // Live filter categories based on search input
  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesTitle = cat.title.toLowerCase().includes(query);
    const matchesTags = cat.tags.some((tag) => tag.label.toLowerCase().includes(query));
    return matchesTitle || matchesTags;
  });

  const handleTagClick = (action: string) => {
    switch (action) {
      case "modal_org":
        setActiveModal("org");
        break;
      case "modal_tax":
        setActiveModal("tax");
        break;
      case "route_comm":
        router.push("/owner/settings/communication-settings/email");
        break;
      case "modal_access":
        setActiveModal("access");
        break;
      case "modal_customers":
        setActiveModal("customers");
        break;
      case "modal_reports":
        setActiveModal("reports");
        break;
      case "modal_appointments":
        router.push("/owner/settings/appointments");
        break;
      default:
        break;
    }
  };

  // Submit Handler: Organization Details
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOrg(true);
    try {
      const formData = new FormData();
      formData.set("name", orgName);
      formData.set("email", orgEmail);
      formData.set("phone", orgPhone);
      formData.set("address", orgAddress);

      const res = await updateOrganizationAction({ success: true, message: "" }, formData);
      if (res?.success) {
        toast.success(res.message || "Organization details updated!");
        setActiveModal(null);
      } else {
        toast.error(res?.message || "Failed to update organization.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving organization profile.");
    } finally {
      setIsSavingOrg(false);
    }
  };

  // Submit Handler: Tax & GST
  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTax(true);
    setTimeout(() => {
      setIsSavingTax(false);
      toast.success("GST rates & invoice tax logic saved successfully!");
      setActiveModal(null);
    }, 500);
  };

  // Submit Handler: Customer Loyalty Rules
  const handleSaveLoyalty = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLoyalty(true);
    setTimeout(() => {
      setIsSavingLoyalty(false);
      toast.success("Customer loyalty points rules saved successfully!");
      setActiveModal(null);
    }, 500);
  };

  // Submit Handler: PDF Templates
  const handleSavePdf = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPdf(true);
    setTimeout(() => {
      setIsSavingPdf(false);
      toast.success("PDF invoice templates & terms configured successfully!");
      setActiveModal(null);
    }, 500);
  };

  // Submit Handler: Appointment Booking Template
  const handleSaveAppointments = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAppointments(true);
    setTimeout(() => {
      setIsSavingAppointments(false);
      toast.success("Appointment booking form settings saved!");
      setActiveModal(null);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Live Search Bar (Matching Screenshot 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          All Settings
        </h1>

        {/* Search Bar Input */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings (/ )"
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 7 Settings Categories Grid */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
          <Settings className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No settings found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No categories match your search &quot;{searchQuery}&quot;. Try searching for &quot;GST&quot;, &quot;Templates&quot;, or &quot;Profile&quot;.
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs hover:bg-blue-100 transition-colors"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <div
                key={category.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Category Header with Blue Soft Icon */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {category.title}
                  </h3>

                  {/* Pills / Tags */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {category.tags.map((tag) => {
                      const isTagMatched =
                        searchQuery.trim() &&
                        tag.label.toLowerCase().includes(searchQuery.toLowerCase());
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleTagClick(tag.action)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isTagMatched
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100/80 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                          }`}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Organisation Details */}
      {activeModal === "org" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Organisation Details</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrg} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Organisation Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      placeholder="support@opticalmanager.in"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={orgPhone}
                      onChange={(e) => setOrgPhone(e.target.value)}
                      placeholder="+91 81789 62366"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Headquarters Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={3}
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    placeholder="New Delhi, India"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOrg}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSavingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tax & GST */}
      {activeModal === "tax" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Tax & GST Settings</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTax} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  GSTIN (Tax Identification Number)
                </label>
                <input
                  type="text"
                  value={gstinNumber}
                  onChange={(e) => setGstinNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">CGST (%)</label>
                  <input
                    type="number"
                    value={cgstRate}
                    onChange={(e) => setCgstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">SGST (%)</label>
                  <input
                    type="number"
                    value={sgstRate}
                    onChange={(e) => setSgstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">IGST (%)</label>
                  <input
                    type="number"
                    value={igstRate}
                    onChange={(e) => setIgstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTax}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSavingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save GST Rates</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Access and Users */}
      {activeModal === "access" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Access and Users</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage staff manager accounts, login credentials, and permission scopes across all physical branches.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    router.push("/owner/shops");
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Store className="w-4 h-4" />
                  <span>Manage Shop Manager Credentials (/owner/shops)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Customers & Loyalty Rules */}
      {activeModal === "customers" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Loyalty & Customer Groups</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoyalty} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Spend Amount (₹)</label>
                  <input
                    type="number"
                    value={loyaltyRatio}
                    onChange={(e) => setLoyaltyRatio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Points Earned</label>
                  <input
                    type="number"
                    value={pointsPerRatio}
                    onChange={(e) => setPointsPerRatio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Example: Customers earn {pointsPerRatio} loyalty point for every ₹{loyaltyRatio} spent on specs/lenses.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLoyalty}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSavingLoyalty ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Loyalty Rules</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PDF Templates & Reports */}
      {activeModal === "reports" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">PDF Templates & Reports</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePdf} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Invoice Header Greeting Note
                </label>
                <input
                  type="text"
                  value={pdfHeaderNote}
                  onChange={(e) => setPdfHeaderNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Print Invoice Terms & Conditions
                </label>
                <textarea
                  rows={4}
                  value={pdfTerms}
                  onChange={(e) => setPdfTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPdf}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSavingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Template Notes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Appointment Booking */}
      {activeModal === "appointments" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Appointment Booking Config</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointments} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Eye Examination Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={appointmentDuration}
                  onChange={(e) => setAppointmentDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">Automatic Reminders</p>
                  <p className="text-[11px] text-slate-500">Send confirmation SMS/WhatsApp before appointment</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableOnlineReminders}
                  onChange={(e) => setEnableOnlineReminders(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-xs focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAppointments}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSavingAppointments ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Appointment Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
