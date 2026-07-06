"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, Store, MessageSquare, Percent, Users, 
  DollarSign, FileText, User, Search, ArrowLeft, Settings,
  Save, Landmark, ShieldCheck, Mail, Trash2, Plus, Clock, 
  Award, X, Check, Star, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { updateShopProfileAction, updateShopSettingsConfigAction, toggleStaffActiveAction } from "@/actions/shop-settings.actions";
import { parseWhatsAppTemplate } from "@/utils/whatsapp-parser";

interface SettingsPageClientProps {
  shop: any;
  staff: any[];
  activeView: string | null;
}

interface SettingItem {
  id: string;
  label: string;
  category: string;
}

const SETTING_ITEMS: SettingItem[] = [
  // Store Details
  { id: "profile", label: "Profile", category: "Store Details" },
  { id: "hours", label: "Business Hours", category: "Store Details" },
  { id: "contact", label: "Contact Info", category: "Store Details" },
  
  // Communication
  { id: "whatsapp", label: "WhatsApp Templates", category: "Communication" },
  { id: "email", label: "Email Templates", category: "Communication" },
  { id: "campaigns", label: "Campaigns", category: "Communication" },
  { id: "sms", label: "SMS Alerts", category: "Communication" },
  
  // Tax & GST
  { id: "gst-rates", label: "GST Rates", category: "Tax & GST" },
  { id: "tax-logic", label: "Taxation Logic", category: "Tax & GST" },
  
  // Access and Users
  { id: "staff", label: "Staff Management", category: "Access and Users" },
  { id: "permissions", label: "Roles & Permissions", category: "Access and Users" },
  
  // Expenses
  { id: "categories", label: "Categories", category: "Expenses" },
  { id: "vendors", label: "Vendors", category: "Expenses" },
  
  // Reports
  { id: "templates", label: "PDF Templates", category: "Reports" },
  { id: "auto-reports", label: "Auto-Reports", category: "Reports" },
  
  // Customers
  { id: "loyalty", label: "Loyalty Program", category: "Customers" },
  { id: "customer-groups", label: "Customer Groups", category: "Customers" },
];

export function SettingsPageClient({ shop, staff, activeView }: SettingsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tabbed layout state
  const [activeTab, setActiveTab] = useState<string | null>(null); // "store" | "communication" | "tax" | "access" | "expenses" | "reports" | "customers"
  const [activeSubTab, setActiveSubTab] = useState<string>(""); // e.g. "profile" | "hours" | "whatsapp" | "gst-rates"

  // 1. Profile state
  const [profileName, setProfileName] = useState(shop?.name || "");
  const [profilePhone, setProfilePhone] = useState(shop?.phone || "");
  const [profileEmail, setProfileEmail] = useState(shop?.email || "");
  const [profileAddress, setProfileAddress] = useState(shop?.address || "");
  const [profileGstin, setProfileGstin] = useState(shop?.gstin || "");
  const [profileCin, setProfileCin] = useState(shop?.cin || "");
  const [profileMsme, setProfileMsme] = useState(shop?.msmeUdyam || "");
  const [bankName, setBankName] = useState(shop?.bankName || "");
  const [bankBranch, setBankBranch] = useState(shop?.bankBranch || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(shop?.bankAccountNumber || "");
  const [bankIfsc, setBankIfsc] = useState(shop?.bankIfsc || "");

  // 2. Business Hours state
  const defaultHours = {
    monday: { open: "09:00", close: "21:00", closed: false },
    tuesday: { open: "09:00", close: "21:00", closed: false },
    wednesday: { open: "09:00", close: "21:00", closed: false },
    thursday: { open: "09:00", close: "21:00", closed: false },
    friday: { open: "09:00", close: "21:00", closed: false },
    saturday: { open: "09:00", close: "21:00", closed: false },
    sunday: { open: "10:00", close: "18:00", closed: true },
  };
  const [hours, setHours] = useState<any>(shop?.settings?.businessHours || defaultHours);

  // 3. Tax / GST state
  const [taxationLogic, setTaxationLogic] = useState<"inclusive" | "exclusive">(shop?.settings?.taxationLogic || "inclusive");
  const [gstRates, setGstRates] = useState<number[]>(shop?.settings?.gstRates || [5, 12, 18, 28]);
  const [newGstRate, setNewGstRate] = useState("");

  // 4. Loyalty settings state
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(shop?.settings?.loyaltyEnabled ?? false);
  const [loyaltyRatio, setLoyaltyRatio] = useState<number>(shop?.settings?.loyaltyPointsRatio || 100);
  const [loyaltyValue, setLoyaltyValue] = useState<number>(shop?.settings?.loyaltyRedeemValue || 1);

  // 5. WhatsApp Customizer state
  const DEFAULT_WHATSAPP_TEMPLATES = {
    invoice_sent: {
      enabled: true,
      template: "Dear {{customer_name}},\n\nThank you for choosing {{shop_name}}! Your invoice {{invoice_number}} is ready.\n\n*Invoice Summary:*\n• Total Amount: {{amount}}\n• Amount Paid: {{amount_paid}}\n• Balance Due: {{balance_due}}\n• Payment Method: {{payment_method}}\n• Delivery Status: {{fulfillment_status}}\n\nView and download your digital PDF bill here: {{invoice_url}}\n\nHave a great day!",
    },
    order_complete: {
      enabled: true,
      template: "Hi {{customer_name}},\n\nYour spectacles/lenses order under order number {{order_number}} is ready for pickup/delivery at {{shop_name}}!\n\nFeel free to visit us or contact us at {{phone}}.",
    },
    delivery_sent: {
      enabled: false,
      template: "Hello {{customer_name}},\n\nYour spectacles/lenses order {{order_number}} from {{shop_name}} is in progress.\n\nExpected delivery date: {{estimated_delivery}}.\n\nFeel free to contact us at {{phone}}.",
    },
    delivery_delay: {
      enabled: false,
      template: "Dear {{customer_name}},\n\nWe regret to inform you that your spectacles/lenses order {{order_number}} from {{shop_name}} has been delayed.\n\nThe revised expected delivery date is: {{estimated_delivery}}.\n\nWe apologize for the inconvenience. Feel free to contact us at {{phone}}.",
    },
  };
  const [whatsappTemplates, setWhatsappTemplates] = useState<any>(shop?.settings?.whatsappTemplates || DEFAULT_WHATSAPP_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("invoice_sent");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 6. Email Customizer state
  const [emailTemplates, setEmailTemplates] = useState<any>(shop?.settings?.emailTemplates || {
    invoice_sent: true,
    prescription_ready: true,
    daily_eod_summary: false
  });

  // 7. Expense state
  const [expenseCategories, setExpenseCategories] = useState<string[]>(shop?.settings?.expenseCategories || ["Rent", "Electricity", "Tea & Snacks", "Inventory", "Salaries"]);
  const [newExpenseCat, setNewExpenseCat] = useState("");
  const [expenseVendors, setExpenseVendors] = useState<any[]>(shop?.settings?.expenseVendors || []);
  const [newVendor, setNewVendor] = useState({ name: "", contact: "", phone: "", email: "", gstin: "" });

  // 8. Report template state
  const [pdfInvoiceTemplate, setPdfInvoiceTemplate] = useState<"classic" | "elegant" | "compact">(shop?.settings?.pdfInvoiceTemplate || "classic");
  const [reportType, setReportType] = useState<"daily" | "weekly" | "off">(shop?.settings?.autoReportSchedule?.type || "off");
  const [reportEmail, setReportEmail] = useState(shop?.settings?.autoReportSchedule?.email || "");

  // Sync Search URL view parameters with UI Tabs
  useEffect(() => {
    if (activeView) {
      if (["profile", "hours", "contact"].includes(activeView)) {
        setActiveTab("store");
        setActiveSubTab(activeView);
      } else if (["whatsapp", "email", "campaigns", "sms"].includes(activeView)) {
        setActiveTab("communication");
        setActiveSubTab(activeView);
      } else if (["gst-rates", "tax-logic"].includes(activeView)) {
        setActiveTab("tax");
        setActiveSubTab(activeView);
      } else if (["staff", "permissions"].includes(activeView)) {
        setActiveTab("access");
        setActiveSubTab(activeView);
      } else if (["categories", "vendors"].includes(activeView)) {
        setActiveTab("expenses");
        setActiveSubTab(activeView);
      } else if (["templates", "auto-reports"].includes(activeView)) {
        setActiveTab("reports");
        setActiveSubTab(activeView);
      } else if (["loyalty", "customer-groups"].includes(activeView)) {
        setActiveTab("customers");
        setActiveSubTab(activeView);
      }
    } else {
      setActiveTab(null);
      setActiveSubTab("");
    }
  }, [activeView]);

  // Focus search input on "/" keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenView = (viewId: string) => {
    router.push(`/shop/settings?view=${viewId}`);
  };

  const handleCloseView = () => {
    router.push("/shop/settings");
  };

  const handleSelectTab = (tabId: string) => {
    // Map main tabs to standard initial sub-tabs
    const defaultSubMap: Record<string, string> = {
      store: "profile",
      communication: "whatsapp",
      tax: "gst-rates",
      access: "staff",
      expenses: "categories",
      reports: "templates",
      customers: "loyalty"
    };
    router.push(`/shop/settings?view=${defaultSubMap[tabId]}`);
  };

  // Profile Save
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", profileName);
    data.append("phone", profilePhone);
    data.append("email", profileEmail);
    data.append("address", profileAddress);
    data.append("gstin", profileGstin);
    data.append("cin", profileCin);
    data.append("msmeUdyam", profileMsme);
    data.append("bankName", bankName);
    data.append("bankBranch", bankBranch);
    data.append("bankAccountNumber", bankAccountNumber);
    data.append("bankIfsc", bankIfsc);

    startTransition(async () => {
      const res = await updateShopProfileAction(shop.id, undefined, data);
      if (res?.success) {
        toast.success(res.message);
      } else {
        toast.error(res?.message || "Failed to update profile.");
      }
    });
  };

  // Settings Save Helper
  const handleSaveConfig = async (key: string, value: any, successMsg = "Configuration saved successfully.") => {
    startTransition(async () => {
      const res = await updateShopSettingsConfigAction(shop.id, { [key]: value });
      if (res.success) {
        toast.success(successMsg);
      } else {
        toast.error(res.message);
      }
    });
  };

  // Filter cards on overview screen
  const filteredItems = SETTING_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getItemsForCategory = (categoryName: string) => {
    return filteredItems.filter((item) => item.category === categoryName);
  };

  const isCategoryVisible = (categoryName: string) => {
    return getItemsForCategory(categoryName).length > 0;
  };

  // Categories Sidebar Array
  const CATEGORIES = [
    { id: "store", label: "Store Details", icon: Store, color: "text-blue-650 bg-blue-50 border-blue-100/50" },
    { id: "communication", label: "Communication", icon: MessageSquare, color: "text-emerald-700 bg-emerald-50 border-emerald-100/50" },
    { id: "tax", label: "Tax & GST", icon: Percent, color: "text-amber-700 bg-amber-50 border-amber-100/50" },
    { id: "access", label: "Access and Users", icon: Users, color: "text-purple-700 bg-purple-50 border-purple-100/50" },
    { id: "expenses", label: "Expenses", icon: DollarSign, color: "text-rose-700 bg-rose-50 border-rose-100/50" },
    { id: "reports", label: "Reports & PDFs", icon: FileText, color: "text-indigo-700 bg-indigo-50 border-indigo-100/50" },
    { id: "customers", label: "Customers Settings", icon: User, color: "text-teal-700 bg-teal-50 border-teal-100/50" }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full">
      
      {/* CASE A: ALL SETTINGS OVERVIEW GRID LAYOUT */}
      {!activeTab ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-[#0a52c3] animate-pulse" /> All Settings
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Manage your store details, GST configurations, user roles, templates, and loyalty settings.
              </p>
            </div>

            {/* Shortcut Search bar */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search settings ( / )"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-12 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150/15 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-650"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {CATEGORIES.map((cat) => {
              if (!isCategoryVisible(cat.label)) return null;
              return (
                <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${cat.color}`}>
                      <cat.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">{cat.label}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {getItemsForCategory(cat.label).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleOpenView(item.id)}
                        className="px-3.5 py-2 text-xs font-bold text-slate-650 hover:text-indigo-650 bg-slate-50 border border-slate-100 hover:border-indigo-250 hover:bg-indigo-50/15 rounded-xl transition-all cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty Search State */}
          {filteredItems.length === 0 && (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl space-y-3">
              <Search className="w-8 h-8 text-slate-350 mx-auto" />
              <h4 className="font-black text-slate-700 text-xs uppercase tracking-wider">No settings matched "{searchQuery}"</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Try typing profile, GST, email, or loyalty</p>
            </div>
          )}
        </div>
      ) : (
        
        // CASE B: FULL-WIDTH LAYOUT
        <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
          
          {/* Top header navigation breadcrumb */}
          <div className="flex items-center gap-4 border-b border-slate-200 pb-4 mb-4">
            <button
              onClick={handleCloseView}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-250 hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-450" />
              <span>Back to Overview</span>
            </button>
            <div className="h-4 w-px bg-slate-250" />
            <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider">
              {activeTab === "store" ? "Store Details" : 
               activeTab === "communication" ? "Communication" : 
               activeTab === "tax" ? "Tax & GST" : 
               activeTab === "access" ? "Access and Users" : 
               activeTab === "expenses" ? "Expenses" : 
               activeTab === "reports" ? "Reports" : "Customers"} Settings
            </h3>
          </div>
            
            {/* 1. STORE DETAILS SECTION */}
            {activeTab === "store" && (
              <div className="space-y-6">
                {/* Sub-tabs header */}
                <div className="flex border-b border-slate-100 pb-3 gap-6">
                  {[
                    { id: "profile", label: "Store Profile" },
                    { id: "hours", label: "Operating Hours" }
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleOpenView(sub.id)}
                      className={`text-xs font-black uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer ${
                        activeSubTab === sub.id
                          ? "border-indigo-650 text-indigo-750 font-extrabold"
                          : "border-transparent text-slate-450 hover:text-slate-800"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Sub-tab 1A: Profile */}
                {activeSubTab === "profile" && (
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Store className="w-4 h-4 text-slate-400" /> Basic Coordinates
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Shop / Outlet Name</label>
                          <input 
                            type="text" 
                            value={profileName} 
                            onChange={(e) => setProfileName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Contact Phone</label>
                          <input 
                            type="text" 
                            value={profilePhone} 
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Business Email</label>
                          <input 
                            type="email" 
                            value={profileEmail} 
                            onChange={(e) => setProfileEmail(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Full Outlet Address</label>
                          <textarea 
                            value={profileAddress} 
                            onChange={(e) => setProfileAddress(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-slate-400" /> Compliance &amp; Registrations
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">GSTIN Number</label>
                          <input 
                            type="text" 
                            value={profileGstin} 
                            onChange={(e) => setProfileGstin(e.target.value.toUpperCase())}
                            placeholder="e.g. 27AALCC7382F1ZC"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Corporate CIN</label>
                          <input 
                            type="text" 
                            value={profileCin} 
                            onChange={(e) => setProfileCin(e.target.value.toUpperCase())}
                            placeholder="e.g. U32507MH2024PTC422044"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">MSME Udyam Number</label>
                          <input 
                            type="text" 
                            value={profileMsme} 
                            onChange={(e) => setProfileMsme(e.target.value.toUpperCase())}
                            placeholder="e.g. UDYAM-MH-33-0456381"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-slate-400" /> Settlement Bank Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Bank Name</label>
                          <input 
                            type="text" 
                            value={bankName} 
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="e.g. Axis Bank Limited"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Branch Name</label>
                          <input 
                            type="text" 
                            value={bankBranch} 
                            onChange={(e) => setBankBranch(e.target.value)}
                            placeholder="e.g. MIDC Turbhe"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Account Number</label>
                          <input 
                            type="text" 
                            value={bankAccountNumber} 
                            onChange={(e) => setBankAccountNumber(e.target.value)}
                            placeholder="e.g. 924020033652178"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">IFSC Code</label>
                          <input 
                            type="text" 
                            value={bankIfsc} 
                            onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                            placeholder="e.g. UTIB0000661"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={isPending}
                        className="px-5 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Save Store Profile"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Sub-tab 1B: Business Hours */}
                {activeSubTab === "hours" && (
                  <div className="space-y-6">
                    <div className="space-y-3 pb-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" /> Weekly Operating Schedule
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Configure weekly business opening and closing time slots.</p>
                    </div>

                    <div className="space-y-3.5">
                      {Object.keys(hours).map((day) => (
                        <div key={day} className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50 transition-colors">
                          <span className="text-xs font-extrabold uppercase text-slate-700 w-24">{day}</span>
                          <div className="flex items-center gap-4 flex-1 justify-end">
                            
                            {!hours[day].closed ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  type="time" 
                                  value={hours[day].open}
                                  onChange={(e) => setHours({
                                    ...hours,
                                    [day]: { ...hours[day], open: e.target.value }
                                  })}
                                  className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                />
                                <span className="text-[10px] text-slate-450 font-bold uppercase">to</span>
                                <input 
                                  type="time" 
                                  value={hours[day].close}
                                  onChange={(e) => setHours({
                                    ...hours,
                                    [day]: { ...hours[day], close: e.target.value }
                                  })}
                                  className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                />
                              </div>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 tracking-wider">Closed</span>
                            )}

                            <button
                              type="button"
                              onClick={() => setHours({
                                ...hours,
                                [day]: { ...hours[day], closed: !hours[day].closed }
                              })}
                              className={`text-[10px] font-black uppercase px-2.5 py-1 border rounded-lg transition-all cursor-pointer ${
                                hours[day].closed 
                                  ? "bg-slate-250 border-slate-350 text-slate-650"
                                  : "bg-emerald-50 border-emerald-250 text-emerald-700"
                              }`}
                            >
                              {hours[day].closed ? "Open Shop" : "Mark Closed"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => handleSaveConfig("businessHours", hours, "Operating schedule saved successfully.")}
                        disabled={isPending}
                        className="px-5 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Save Operating Hours"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. COMMUNICATION SECTION */}
            {activeTab === "communication" && (
              <div className="space-y-6">
                {/* Sub-tabs */}
                <div className="flex border-b border-slate-100 pb-3 gap-6">
                  {[
                    { id: "whatsapp", label: "WhatsApp Templates" },
                    { id: "email", label: "Email System" }
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleOpenView(sub.id)}
                      className={`text-xs font-black uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer ${
                        activeSubTab === sub.id
                          ? "border-indigo-650 text-indigo-750 font-extrabold"
                          : "border-transparent text-slate-455 hover:text-slate-800"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Sub-tab 2A: WhatsApp Templates Customizer */}
                {activeSubTab === "whatsapp" && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-400" /> WhatsApp Template Broadcasts
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Configure custom notification templates and triggers.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Column 1: Select Template */}
                      <div className="lg:col-span-3 space-y-2 border-r border-slate-100 pr-4">
                        <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Select Template</span>
                        {[
                          { id: "invoice_sent", label: "Invoice Sent", desc: "Digital bill alert" },
                          { id: "order_complete", label: "Order Complete", desc: "Specs pickup notice" },
                          { id: "delivery_sent", label: "Out for Delivery", desc: "Shipment dispatch notice" },
                          { id: "delivery_delay", label: "Delivery Delayed", desc: "Delay notification" }
                        ].map((tpl) => {
                          const isSelected = selectedTemplateId === tpl.id;
                          const isEnabled = whatsappTemplates[tpl.id]?.enabled;
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => setSelectedTemplateId(tpl.id)}
                              className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? "bg-indigo-50/50 border-indigo-250 text-indigo-755 shadow-xs"
                                  : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[10px] font-black uppercase tracking-wide">{tpl.label}</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? "bg-emerald-500" : "bg-slate-350"}`} />
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{tpl.desc}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Column 2: Editor Workspace */}
                      <div className="lg:col-span-5 space-y-4 pr-2">
                        
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black uppercase text-slate-700">
                              {selectedTemplateId.replace("_", " ")}
                            </span>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Configure status and content</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsappTemplates({
                                ...whatsappTemplates,
                                [selectedTemplateId]: {
                                  ...whatsappTemplates[selectedTemplateId],
                                  enabled: !whatsappTemplates[selectedTemplateId]?.enabled
                                }
                              });
                            }}
                            className={`text-[9px] font-black uppercase px-3 py-1.5 border rounded-xl transition-all cursor-pointer ${
                              whatsappTemplates[selectedTemplateId]?.enabled
                                ? "bg-emerald-50 border-emerald-250 text-emerald-750 font-extrabold"
                                : "bg-slate-100 border-slate-200 text-slate-500"
                            }`}
                          >
                            {whatsappTemplates[selectedTemplateId]?.enabled ? "Trigger Active" : "Trigger Inactive"}
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Edit Template Message</label>
                          <textarea
                            ref={textareaRef}
                            rows={11}
                            value={whatsappTemplates[selectedTemplateId]?.template || ""}
                            onChange={(e) => {
                              setWhatsappTemplates({
                                ...whatsappTemplates,
                                [selectedTemplateId]: {
                                  ...whatsappTemplates[selectedTemplateId],
                                  template: e.target.value
                                }
                              });
                            }}
                            placeholder="Type your WhatsApp notification message..."
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none min-h-[260px]"
                          />
                        </div>

                        <div className="space-y-2">
                          <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Click to insert placeholder</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { code: "customer_name", label: "Customer Name" },
                              { code: "shop_name", label: "Shop Name" },
                              { code: "phone", label: "Shop Phone" },
                              { code: "invoice_number", label: "Invoice Number" },
                              { code: "amount", label: "Total Amount" },
                              { code: "amount_paid", label: "Amount Paid" },
                              { code: "balance_due", label: "Balance Due" },
                              { code: "payment_method", label: "Payment Method" },
                              { code: "fulfillment_status", label: "Delivery Status" },
                              { code: "estimated_delivery", label: "Est. Delivery" },
                              { code: "order_number", label: "Order Number" },
                              { code: "invoice_url", label: "Invoice URL" }
                            ].map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  const textarea = textareaRef.current;
                                  if (!textarea) return;
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const text = textarea.value;
                                  const before = text.substring(0, start);
                                  const after = text.substring(end, text.length);
                                  const inserted = `{{${item.code}}}`;
                                  
                                  setWhatsappTemplates({
                                    ...whatsappTemplates,
                                    [selectedTemplateId]: {
                                      ...whatsappTemplates[selectedTemplateId],
                                      template: before + inserted + after
                                    }
                                  });

                                  setTimeout(() => {
                                    textarea.focus();
                                    textarea.selectionStart = textarea.selectionEnd = start + inserted.length;
                                  }, 0);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-655 transition-all cursor-pointer"
                              >
                                +{item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Column 3: Live Preview */}
                      <div className="lg:col-span-4 space-y-2 border-l border-slate-100 pl-4 h-full flex flex-col justify-start">
                        <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Live WhatsApp Preview</span>
                        <div className="rounded-2xl border border-slate-200 bg-[#efeae2] p-4 relative min-h-[280px] flex flex-col justify-end">
                          
                          {/* WhatsApp green message bubble */}
                          <div className="bg-[#d9fdd3] text-slate-800 text-xs py-2.5 px-4 rounded-2xl rounded-tr-none shadow-xs relative max-w-[90%] self-end flex flex-col gap-1 border border-[#c1e6b9]/40">
                            <div className="whitespace-pre-wrap font-sans text-[11px] text-slate-800 leading-relaxed break-words">
                              {parseWhatsAppTemplate(
                                whatsappTemplates[selectedTemplateId]?.template || "",
                                {
                                  customer_name: "Gaurav Kumar",
                                  shop_name: shop?.name || "Clarity Eyecare",
                                  phone: shop?.phone || "+91 74161 06064",
                                  invoice_number: "INV-2026-0812",
                                  amount: "Rs. 1,899/-",
                                  amount_paid: "Rs. 1,000/-",
                                  balance_due: "Rs. 899/-",
                                  payment_method: "UPI",
                                  fulfillment_status: "READY",
                                  estimated_delivery: "July 12, 2026",
                                  order_number: "ORD-9824",
                                  invoice_url: "https://opt.mgr/inv/0812"
                                }
                              )}
                            </div>
                            <div className="flex items-center justify-end gap-1 text-[8px] text-slate-450 font-bold self-end mt-0.5 select-none uppercase tracking-wider">
                              <span>10:24 PM</span>
                              <span className="text-[#53bdeb] font-extrabold">✓✓</span>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 2B: Email Routing */}
                {activeSubTab === "email" && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" /> Email Notifications Routing
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Control automated triggers via MailerSend SMTP system</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { key: "invoice_sent", label: "Invoice Copy Delivery", desc: "Send invoice PDF and payment receipts directly to client inbox." },
                        { key: "prescription_ready", label: "Prescription specs receipt", desc: "Email detailed optical prescription dimensions (OS/OD/IPD)." },
                        { key: "daily_eod_summary", label: "EOD Summary report", desc: "Send daily sales, stock movement, and collection summary to Owner." }
                      ].map((item) => (
                        <div key={item.key} className="flex items-start justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50 transition-colors gap-4">
                          <div className="space-y-0.5">
                            <span className="text-xs font-extrabold uppercase text-slate-700">{item.label}</span>
                            <p className="text-[10px] text-slate-455 leading-relaxed font-bold">{item.desc}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEmailTemplates({
                              ...emailTemplates,
                              [item.key]: !emailTemplates[item.key]
                            })}
                            className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors cursor-pointer duration-300 ${
                              emailTemplates[item.key] ? "bg-indigo-650" : "bg-slate-200"
                            }`}
                          >
                            <div className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-300 ${
                              emailTemplates[item.key] ? "translate-x-5" : "translate-x-0"
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => handleSaveConfig("emailTemplates", emailTemplates, "Email system settings updated.")}
                        disabled={isPending}
                        className="px-5 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Save Email Settings"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. TAX & GST SECTION */}
            {activeTab === "tax" && (
              <div className="space-y-6">
                <div className="space-y-3 pb-6 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" /> Taxation Logic
                  </h4>
                  <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setTaxationLogic("inclusive")}
                      className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        taxationLogic === "inclusive"
                          ? "bg-white text-indigo-655 shadow-sm border border-slate-200/30"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Inclusive of Tax
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxationLogic("exclusive")}
                      className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        taxationLogic === "exclusive"
                          ? "bg-white text-indigo-655 shadow-sm border border-slate-200/30"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Exclusive of Tax
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 italic">
                    Determines whether items prices configured in inventory already contain GST or if tax is appended during checkout.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-400" /> GST Tax Rates (%)
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {gstRates.map((rate) => (
                      <span key={rate} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs">
                        {rate}%
                        <button
                          type="button"
                          onClick={() => setGstRates(gstRates.filter((r) => r !== rate))}
                          className="text-indigo-400 hover:text-indigo-700 cursor-pointer ml-1 p-0.5 rounded hover:bg-indigo-100/50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 max-w-xs">
                    <input 
                      type="number" 
                      placeholder="e.g. 18"
                      value={newGstRate}
                      onChange={(e) => setNewGstRate(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const rate = parseFloat(newGstRate);
                        if (!isNaN(rate) && rate >= 0 && rate <= 100) {
                          if (gstRates.includes(rate)) return;
                          setGstRates([...gstRates, rate].sort((a, b) => a - b));
                          setNewGstRate("");
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-755 text-white p-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">GSTIN number Reference</label>
                    <input 
                      type="text" 
                      value={profileGstin} 
                      onChange={(e) => setProfileGstin(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={async () => {
                      startTransition(async () => {
                        const res1 = await updateShopSettingsConfigAction(shop.id, {
                          taxationLogic,
                          gstRates
                        });
                        if (profileGstin !== shop.gstin) {
                          const data = new FormData();
                          data.append("name", shop.name);
                          data.append("gstin", profileGstin);
                          await updateShopProfileAction(shop.id, undefined, data);
                        }
                        if (res1.success) {
                          toast.success("GST and Taxation settings updated successfully.");
                        } else {
                          toast.error(res1.message);
                        }
                      });
                    }}
                    disabled={isPending}
                    className="px-5 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Save Tax Settings"}
                  </button>
                </div>
              </div>
            )}

            {/* 4. ACCESS & STAFF SECTION */}
            {activeTab === "access" && (
              <div className="space-y-6">
                <div className="space-y-1 pb-4 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> Active Shop Staff &amp; Managers
                  </h4>
                  <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Control employee authorization status</p>
                </div>

                <div className="space-y-3.5">
                  {staff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-slate-850 block">{member.fullName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-450 font-bold">{member.email}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase bg-slate-100 border border-slate-200 text-slate-500">
                            {member.role}
                          </span>
                        </div>
                      </div>
                      
                      {member.role !== "OWNER" ? (
                        <button
                          type="button"
                          onClick={async () => {
                            startTransition(async () => {
                              const res = await toggleStaffActiveAction(member.id, !member.isActive);
                              if (res.success) {
                                toast.success(res.message);
                              } else {
                                toast.error(res.message);
                              }
                            });
                          }}
                          className={`text-[10px] font-black uppercase px-3 py-1 border rounded-lg transition-all cursor-pointer ${
                            member.isActive 
                              ? "bg-rose-50 border-rose-200 text-rose-700" 
                              : "bg-emerald-50 border-emerald-250 text-emerald-700"
                          }`}
                        >
                          {member.isActive ? "Deactivate" : "Activate"}
                        </button>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Super User</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50/50 p-4 border border-amber-200 rounded-2xl">
                  <span className="block text-[10px] font-black uppercase text-amber-700 tracking-wider">Note: Add New Shop Managers</span>
                  <p className="text-[10px] text-amber-600 leading-relaxed font-bold mt-1">
                    To register a new shop manager, assign them a shop, or configure passwords, please visit the **Owner Portal** dashboard at **Shops &amp; Access** tab.
                  </p>
                </div>
              </div>
            )}

            {/* 5. EXPENSES SECTION */}
            {activeTab === "expenses" && (
              <div className="space-y-6">
                
                {/* Categories */}
                <div className="space-y-4 pb-6 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" /> Expense Categories
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    {expenseCategories.map((cat) => (
                      <span key={cat} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-250 text-slate-650 font-bold text-xs px-2.5 py-1 rounded-xl">
                        {cat}
                        <button 
                          onClick={() => setExpenseCategories(expenseCategories.filter((c) => c !== cat))}
                          className="text-slate-405 hover:text-slate-700 ml-1 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 max-w-xs">
                    <input 
                      type="text" 
                      placeholder="New category..."
                      value={newExpenseCat}
                      onChange={(e) => setNewExpenseCat(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newExpenseCat.trim()) {
                          if (expenseCategories.includes(newExpenseCat.trim())) return;
                          setExpenseCategories([...expenseCategories, newExpenseCat.trim()]);
                          setNewExpenseCat("");
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-755 text-white p-2.5 rounded-xl cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Vendors list */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" /> Registered Vendors &amp; Distributors
                  </h4>

                  {expenseVendors.length > 0 ? (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {expenseVendors.map((vendor, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-800">{vendor.name}</span>
                            <span className="block text-[9px] text-slate-450 uppercase font-semibold">Contact: {vendor.contact || "N/A"} • Phone: {vendor.phone || "N/A"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpenseVendors(expenseVendors.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-bold uppercase italic py-2">No custom vendors registered.</p>
                  )}

                  <div className="bg-slate-50/40 p-4 border border-slate-200 rounded-2xl space-y-3">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-450">Add new vendor</span>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="Vendor Name"
                        value={newVendor.name}
                        onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Contact Person"
                        value={newVendor.contact}
                        onChange={(e) => setNewVendor({ ...newVendor, contact: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Phone"
                        value={newVendor.phone}
                        onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="GSTIN"
                        value={newVendor.gstin}
                        onChange={(e) => setNewVendor({ ...newVendor, gstin: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (newVendor.name.trim()) {
                          setExpenseVendors([...expenseVendors, { ...newVendor }]);
                          setNewVendor({ name: "", contact: "", phone: "", email: "", gstin: "" });
                          toast.success("Vendor added.");
                        }
                      }}
                      className="w-full bg-slate-250 hover:bg-slate-350 text-slate-700 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Add Vendor to List
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={async () => {
                      startTransition(async () => {
                        const res1 = await updateShopSettingsConfigAction(shop.id, {
                          expenseCategories,
                          expenseVendors
                        });
                        if (res1.success) {
                          toast.success("Expense configurations saved successfully.");
                        } else {
                          toast.error(res1.message);
                        }
                      });
                    }}
                    disabled={isPending}
                    className="px-5 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Save Expense Configs"}
                  </button>
                </div>
              </div>
            )}

            {/* 6. REPORTS SECTION */}
            {activeTab === "reports" && (
              <div className="space-y-6">
                <div className="space-y-3 pb-6 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Invoice PDF Templates
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "classic", label: "Classic Blueprint" },
                      { id: "elegant", label: "Elegant Border" },
                      { id: "compact", label: "Compact Receipt" }
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setPdfInvoiceTemplate(tpl.id as any)}
                        className={`p-4 border rounded-xl text-left transition-all cursor-pointer ${
                          pdfInvoiceTemplate === tpl.id
                            ? "bg-indigo-50 border-indigo-250 text-indigo-755 shadow-xs"
                            : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                        }`}
                      >
                        <span className="block text-[11px] font-black uppercase">{tpl.label}</span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                          {tpl.id === "compact" ? "80mm thermal" : "A4 document"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" /> Automated EOD Email Reports
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Schedule Interval</label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="off">Deactivated</option>
                        <option value="daily">Daily EOD Summary</option>
                        <option value="weekly">Weekly Business Summary</option>
                      </select>
                    </div>

                    {reportType !== "off" && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Destination Email</label>
                        <input 
                          type="email" 
                          placeholder="owner@clarityeyecare.in"
                          value={reportEmail}
                          onChange={(e) => setReportEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => handleSaveConfig("pdfInvoiceTemplate", pdfInvoiceTemplate, "Reports settings updated.")}
                    disabled={isPending}
                    className="px-5 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Save Report Settings"}
                  </button>
                </div>
              </div>
            )}

            {/* 7. CUSTOMERS SECTION */}
            {activeTab === "customers" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-indigo-150 rounded-2xl bg-indigo-50/10">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black uppercase text-indigo-755 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" /> loyalty reward program
                    </h4>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Provide points to customers on purchases</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
                    className={`w-12 h-6.5 rounded-full p-1 transition-all cursor-pointer duration-300 ${
                      loyaltyEnabled ? "bg-indigo-650" : "bg-slate-200"
                    }`}
                  >
                    <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-300 ${
                      loyaltyEnabled ? "translate-x-5.5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {loyaltyEnabled && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Earning Rule</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-600">Earn 1 loyalty point for every</span>
                        <input 
                          type="number" 
                          value={loyaltyRatio} 
                          onChange={(e) => setLoyaltyRatio(parseInt(e.target.value) || 0)}
                          className="w-24 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-xs font-extrabold text-slate-700 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-600">Rs spent</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Redemption Rule</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-600">1 loyalty point is equal to</span>
                        <input 
                          type="number" 
                          step="0.1"
                          value={loyaltyValue} 
                          onChange={(e) => setLoyaltyValue(parseFloat(e.target.value) || 0)}
                          className="w-24 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-xs font-extrabold text-slate-700 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-600">Rs discount</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      handleSaveConfig("loyaltyEnabled", loyaltyEnabled, "Loyalty program settings updated.");
                      handleSaveConfig("loyaltyPointsRatio", loyaltyRatio);
                      handleSaveConfig("loyaltyRedeemValue", loyaltyValue);
                    }}
                    disabled={isPending}
                    className="px-5 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Save Loyalty Settings"}
                  </button>
                </div>
              </div>
            )}

        </div>
      )}
      
    </div>
  );
}
