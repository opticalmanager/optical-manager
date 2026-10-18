"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, Store, MessageSquare, Percent, Users, 
  DollarSign, FileText, User, Search, ArrowLeft, Settings,
  Save, Landmark, ShieldCheck, Mail, Trash2, Plus, Clock, 
  Award, X, Check, Star, ShieldAlert,
  Laptop, Download, Copy, RefreshCw, Globe, Zap, Radio, CheckCircle2, AlertCircle, QrCode,
  Share2, ExternalLink, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { updateShopProfileAction, updateShopSettingsConfigAction, toggleStaffActiveAction } from "@/actions/shop-settings.actions";
import { parseWhatsAppTemplate } from "@/utils/whatsapp-parser";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/utils/whatsapp-templates";
import { CategoryGstRatesSettings } from "@/components/shop/CategoryGstRatesSettings";
import { DocumentSeriesSettings } from "@/components/shop/DocumentSeriesSettings";
import { generateShopPairingKeyAction, checkDesktopAssistantStatusAction, triggerDesktopAssistantDisconnectAction } from "@/actions/desktop-wa.actions";
import { getStateFromGSTIN } from "@/utils/gstin";
import type { SocialReviewLinksSettings } from "@/types";
import { SocialReviewPills, GoogleColorIcon, InstagramColorIcon, normalizeInstagramUrl } from "@/components/shop/SocialReviewLinks";

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
  { id: "series", label: "Series & Custom IDs", category: "Store Details" },
  
  // Communication
  { id: "whatsapp-utility", label: "WhatsApp Utility", category: "Communication" },
  { id: "whatsapp", label: "WhatsApp Templates", category: "Communication" },
  { id: "social-links", label: "Google & Instagram Reviews", category: "Communication" },
  { id: "email", label: "Email System", category: "Communication" },
  
  // Tax & GST
  { id: "gst-rates", label: "GST Rates", category: "Tax & GST" },
  { id: "tax-logic", label: "Taxation Logic", category: "Tax & GST" },
  
  // Access and Users
  { id: "staff", label: "Staff Management", category: "Access and Users" },
  { id: "permissions", label: "Roles & Permissions", category: "Access and Users" },
  
  // Expenses
  { id: "categories", label: "Categories", category: "Expenses" },
  { id: "vendors", label: "Vendors", category: "Expenses" },
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



  // 5. WhatsApp Customizer state
  const [whatsappTemplates, setWhatsappTemplates] = useState<any>(shop?.settings?.whatsappTemplates || DEFAULT_WHATSAPP_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("order_form_sent");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 5B. Shop Desktop Assistant Pairing state & Dispatch Mode
  const [whatsappDispatchMode, setWhatsappDispatchMode] = useState<"whatsapp_web" | "desktop_assistant" | "official_api">(
    shop?.settings?.whatsappDispatchMode || "whatsapp_web"
  );
  const [shopPairingKey, setShopPairingKey] = useState("");
  const [isShopDesktopOnline, setIsShopDesktopOnline] = useState(false);
  const [isShopWaConnected, setIsShopWaConnected] = useState(false);
  const [shopConnectedPhone, setShopConnectedPhone] = useState<string | null>(null);
  const [isLoadingShopPairing, setIsLoadingShopPairing] = useState(false);
  const [isDisconnectingWa, setIsDisconnectingWa] = useState(false);
  const [hasCopiedShopKey, setHasCopiedShopKey] = useState(false);

  useEffect(() => {
    if (shop?.settings?.whatsappDispatchMode) {
      setWhatsappDispatchMode(shop.settings.whatsappDispatchMode);
    }
  }, [shop?.settings?.whatsappDispatchMode]);

  const fetchShopPairing = () => {
    if (!shop?.id) return;
    setIsLoadingShopPairing(true);
    generateShopPairingKeyAction(shop.id)
      .then((res) => {
        if (res.success && res.data) {
          setShopPairingKey(res.data.pairingKey);
          setIsShopDesktopOnline(res.data.isOnline);
          setIsShopWaConnected(res.data.isWaConnected);
          setShopConnectedPhone(res.data.connectedPhone || null);
        }
      })
      .finally(() => setIsLoadingShopPairing(false));
  };

  const refreshConnectionStatus = async () => {
    if (!shop?.id) return;
    setIsLoadingShopPairing(true);
    try {
      const statusRes = await checkDesktopAssistantStatusAction(shop.id);
      setIsShopDesktopOnline(statusRes.isOnline);
      setIsShopWaConnected(statusRes.isWaConnected);
      setShopConnectedPhone(statusRes.connectedPhone || null);

      if (statusRes.isWaConnected) {
        toast.success(`Desktop Assistant is Online & WhatsApp Connected (+${statusRes.connectedPhone || "Ready"})! ✓`);
      } else if (statusRes.isOnline) {
        toast.info("Desktop Assistant app is open, but WhatsApp is awaiting QR scan.");
      } else {
        toast.info("Desktop Assistant is Offline. Please ensure the app is open on this counter PC.");
      }

      if (!shopPairingKey) {
        const keyRes = await generateShopPairingKeyAction(shop.id);
        if (keyRes.success && keyRes.data) {
          setShopPairingKey(keyRes.data.pairingKey);
        }
      }
    } catch {
      toast.error("Failed to check connection status.");
    } finally {
      setIsLoadingShopPairing(false);
    }
  };

  const handleDisconnectDesktopWa = async () => {
    if (!shop?.id) return;
    setIsDisconnectingWa(true);
    toast.loading("Disconnecting WhatsApp from Desktop Assistant...", { id: "wa-shop-disconnect" });
    try {
      const res = await triggerDesktopAssistantDisconnectAction(shop.id);
      if (res.success) {
        setIsShopWaConnected(false);
        setShopConnectedPhone(null);
        toast.success("WhatsApp disconnected from Desktop Assistant.", { id: "wa-shop-disconnect" });
        refreshConnectionStatus();
      } else {
        toast.error(res.error || "Failed to disconnect", { id: "wa-shop-disconnect" });
      }
    } catch {
      toast.error("An error occurred while disconnecting.", { id: "wa-shop-disconnect" });
    } finally {
      setIsDisconnectingWa(false);
    }
  };

  useEffect(() => {
    if ((activeSubTab === "whatsapp-utility" || activeSubTab === "whatsapp") && shop?.id && !shopPairingKey) {
      fetchShopPairing();
    }
  }, [activeSubTab, shop?.id, shopPairingKey]);

  const handleCopyShopPairingKey = () => {
    if (!shopPairingKey) return;
    navigator.clipboard.writeText(shopPairingKey);
    setHasCopiedShopKey(true);
    toast.success("Counter Pairing Key copied to clipboard!");
    setTimeout(() => setHasCopiedShopKey(false), 3000);
  };

  const handleSelectDispatchMode = (mode: "whatsapp_web" | "desktop_assistant" | "official_api") => {
    if (mode === "official_api") {
      const isConfigured = Boolean(shop?.settings?.metaCloudApi?.isConfigured);
      if (!isConfigured) {
        toast.error("Meta Cloud API is not configured for this branch. Contact administrator.");
        return;
      }
    }
    setWhatsappDispatchMode(mode);
    handleSaveConfig(
      "whatsappDispatchMode",
      mode,
      mode === "desktop_assistant"
        ? (isShopDesktopOnline
            ? "Optical Manager Tool activated! Utility messages will send automatically in 1 click."
            : "Optical Manager Tool selected! Ensure desktop app is running on counter PC for 1-click dispatch.")
        : mode === "whatsapp_web"
        ? "WhatsApp dispatch set to WhatsApp Web (Direct Browser)."
        : "WhatsApp dispatch set to WhatsApp Official API."
    );
  };

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


  const [socialReviewLinks, setSocialReviewLinks] = useState<SocialReviewLinksSettings>(
    shop?.settings?.socialReviewLinks || {
      googleReview: { enabled: false, url: "", showOnInvoices: true, showOnReceipts: true },
      instagram: { enabled: false, url: "", showOnInvoices: true, showOnReceipts: true },
    }
  );
  const [socialPreviewMode, setSocialPreviewMode] = useState<"INVOICE" | "RECEIPT">("INVOICE");

  const updateGoogleReview = (updates: Partial<NonNullable<SocialReviewLinksSettings["googleReview"]>>) => {
    setSocialReviewLinks((prev: SocialReviewLinksSettings): SocialReviewLinksSettings => {
      const currentEnabled = prev.googleReview?.enabled ?? false;
      const isAutoEnabling = updates.url !== undefined && updates.url.trim().length > 0 && updates.enabled === undefined && !currentEnabled;
      const resolvedEnabled = updates.enabled !== undefined ? updates.enabled : (isAutoEnabling ? true : currentEnabled);

      return {
        ...prev,
        googleReview: {
          url: prev.googleReview?.url ?? "",
          showOnInvoices: prev.googleReview?.showOnInvoices ?? true,
          showOnReceipts: prev.googleReview?.showOnReceipts ?? true,
          ...updates,
          enabled: resolvedEnabled,
        },
      };
    });
  };

  const updateInstagram = (updates: Partial<NonNullable<SocialReviewLinksSettings["instagram"]>>) => {
    setSocialReviewLinks((prev: SocialReviewLinksSettings): SocialReviewLinksSettings => {
      const currentEnabled = prev.instagram?.enabled ?? false;
      const isAutoEnabling = updates.url !== undefined && updates.url.trim().length > 0 && updates.enabled === undefined && !currentEnabled;
      const resolvedEnabled = updates.enabled !== undefined ? updates.enabled : (isAutoEnabling ? true : currentEnabled);

      return {
        ...prev,
        instagram: {
          url: prev.instagram?.url ?? "",
          showOnInvoices: prev.instagram?.showOnInvoices ?? true,
          showOnReceipts: prev.instagram?.showOnReceipts ?? true,
          ...updates,
          enabled: resolvedEnabled,
        },
      };
    });
  };

  // Sync Search URL view parameters with UI Tabs
  useEffect(() => {
    if (activeView) {
      if (["profile", "hours", "contact", "series"].includes(activeView)) {
        setActiveTab("store");
        setActiveSubTab(activeView);
      } else if (["whatsapp-utility", "whatsapp", "social-links", "email"].includes(activeView)) {
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
      communication: "whatsapp-utility",
      tax: "gst-rates",
      access: "staff",
      expenses: "categories",
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

  // Categories Sidebar Array - 5 Core Shop Settings
  const CATEGORIES = [
    { 
      id: "store", 
      label: "Store Details", 
      icon: Store, 
      color: "text-blue-600 bg-blue-50 border-blue-100", 
      accentBorder: "hover:border-blue-300",
      description: "Manage branch profile, contact info, business hours, and invoice numbering sequences.",
      badge: profileName ? `Branch: ${profileName}` : "Branch Configured",
      badgeTone: "bg-blue-50 text-blue-700 border-blue-200/60",
      actionLabel: "Configure Store"
    },
    { 
      id: "communication", 
      label: "Communication", 
      icon: MessageSquare, 
      color: "text-emerald-600 bg-emerald-50 border-emerald-100", 
      accentBorder: "hover:border-emerald-300",
      description: "Counter WhatsApp desktop utility, dispatch templates, Google/Instagram reviews, and email alerts.",
      badge: (isShopDesktopOnline && isShopWaConnected) ? "🟢 WhatsApp Ready" : "4 Channels Configured",
      badgeTone: (isShopDesktopOnline && isShopWaConnected) ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-slate-100 text-slate-700 border-slate-200/70",
      actionLabel: "Manage Channels"
    },
    { 
      id: "tax", 
      label: "Tax & GST", 
      icon: Percent, 
      color: "text-amber-600 bg-amber-50 border-amber-100", 
      accentBorder: "hover:border-amber-300",
      description: "Category GST rates master matrix, taxation logic (Inclusive/Exclusive), and store GSTIN reference.",
      badge: taxationLogic === "inclusive" ? "GST: Inclusive" : "GST: Exclusive",
      badgeTone: "bg-amber-50 text-amber-800 border-amber-200/60",
      actionLabel: "Edit Tax Rules"
    },
    { 
      id: "access", 
      label: "Access and Users", 
      icon: Users, 
      color: "text-purple-600 bg-purple-50 border-purple-100", 
      accentBorder: "hover:border-purple-300",
      description: "Shop employees, counter clerks, and managerial authentication statuses.",
      badge: `${staff?.length || 0} Staff Active`,
      badgeTone: "bg-purple-50 text-purple-700 border-purple-200/60",
      actionLabel: "Manage Staff"
    },
    { 
      id: "expenses", 
      label: "Expenses", 
      icon: DollarSign, 
      color: "text-rose-600 bg-rose-50 border-rose-100", 
      accentBorder: "hover:border-rose-300",
      description: "Custom store operational expense categories, registered suppliers, and distribution vendors.",
      badge: `${expenseCategories?.length || 0} Categories`,
      badgeTone: "bg-rose-50 text-rose-700 border-rose-200/60",
      actionLabel: "Configure Expenses"
    },
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
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Manage your store details, GST configurations, user roles, templates, and communication channels.
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-200">
            {CATEGORIES.map((cat) => {
              if (!isCategoryVisible(cat.label)) return null;
              const subItems = getItemsForCategory(cat.label);
              return (
                <div 
                  key={cat.id} 
                  className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md ${cat.accentBorder} transition-all duration-200 flex flex-col justify-between group`}
                >
                  <div className="space-y-3.5">
                    {/* Header: Icon, Title, and Live Chip */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div 
                        onClick={() => handleSelectTab(cat.id)}
                        className="flex items-center gap-3 cursor-pointer"
                        title={`Open ${cat.label} settings`}
                      >
                        <div className={`p-2.5 rounded-xl border ${cat.color} group-hover:scale-105 transition-transform shrink-0`}>
                          <cat.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-blue-600 transition-colors">
                            {cat.label}
                          </h3>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 tracking-wide ${cat.badgeTone}`}>
                        {cat.badge}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {cat.description}
                    </p>

                    {/* Sub-feature Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {subItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleOpenView(item.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-200 rounded-lg transition-all cursor-pointer"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer: Quick Action Link */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleSelectTab(cat.id)}
                      className="text-xs font-bold text-slate-600 group-hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{cat.actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                    </button>
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
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              {activeTab === "store" ? "Store Details" : 
               activeTab === "communication" ? "Communication" : 
               activeTab === "tax" ? "Tax & GST" : 
               activeTab === "access" ? "Access and Users" : "Expenses"} Settings
            </h3>
          </div>
            
            {/* 1. STORE DETAILS SECTION */}
            {activeTab === "store" && (
              <div className="space-y-6">
                {/* Sub-tabs header: Segmented Pill Bar */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto">
                  {[
                    { id: "profile", label: "Store Profile", icon: Store },
                    { id: "hours", label: "Operating Hours", icon: Clock },
                    { id: "series", label: "Series & Numbering", icon: FileText },
                  ].map((sub) => {
                    const isSelected = activeSubTab === sub.id;
                    const IconComp = sub.icon;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleOpenView(sub.id)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                            : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
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
                            maxLength={15}
                            placeholder="27AAAAA0000A1Z5"
                            value={profileGstin} 
                            onChange={(e) => setProfileGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                          {profileGstin.length >= 2 && getStateFromGSTIN(profileGstin) && (
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>State: {getStateFromGSTIN(profileGstin)}</span>
                              <span className="text-emerald-500 font-mono">({profileGstin.slice(0, 2)})</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Corporate CIN</label>
                          <input 
                            type="text" 
                            value={profileCin} 
                            onChange={(e) => setProfileCin(e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">MSME Udyam Number</label>
                          <input 
                            type="text" 
                            value={profileMsme} 
                            onChange={(e) => setProfileMsme(e.target.value.toUpperCase())}
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Branch Name</label>
                          <input 
                            type="text" 
                            value={bankBranch} 
                            onChange={(e) => setBankBranch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Account Number</label>
                          <input 
                            type="text" 
                            value={bankAccountNumber} 
                            onChange={(e) => setBankAccountNumber(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">IFSC Code</label>
                          <input 
                            type="text" 
                            value={bankIfsc} 
                            onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
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

                {/* Sub-tab 1C: Series & Document Sequences */}
                {activeSubTab === "series" && (
                  <DocumentSeriesSettings
                    shopId={shop.id}
                    shopName={shop.name}
                    shopNumber={1}
                    initialSeries={shop.settings?.documentSeries}
                    onSaved={() => router.refresh()}
                  />
                )}
              </div>
            )}

            {/* 2. COMMUNICATION SECTION */}
            {activeTab === "communication" && (
              <div className="space-y-6">
                {/* Sub-tabs header: Segmented Pill Bar */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto">
                  {[
                    { id: "whatsapp-utility", label: "WhatsApp Utility", icon: Laptop },
                    { id: "whatsapp", label: "WhatsApp Templates", icon: MessageSquare },
                    { id: "social-links", label: "Google & Instagram Reviews", icon: Star },
                    { id: "email", label: "Email System", icon: Mail }
                  ].map((sub) => {
                    const isSelected = activeSubTab === sub.id;
                    const IconComp = sub.icon;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleOpenView(sub.id)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                            : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-tab 2A: WhatsApp Dispatch Utility & Assistant Connection */}
                {activeSubTab === "whatsapp-utility" && (
                  <div className="space-y-6">
                    {/* SECTION 1: UPPER CARD - COUNTER DESKTOP ASSISTANT PAIRING */}
                    <div className="p-6 bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/50 border border-slate-200/90 rounded-2xl shadow-xs space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 font-black shrink-0">
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                Optical Manager Desktop Assistant
                              </h4>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                {shop?.name || "This Branch"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold">
                              Windows counter assistant for 1-click silent background WhatsApp messaging directly from your store PC.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-white border border-slate-200 shadow-2xs">
                            {isShopDesktopOnline && isShopWaConnected ? (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-emerald-700">🟢 Connected & Ready</span>
                                {shopConnectedPhone && (
                                  <span className="text-[10px] text-emerald-800 font-mono font-bold hidden sm:inline">
                                    ({shopConnectedPhone.startsWith("+") ? shopConnectedPhone : `+${shopConnectedPhone}`})
                                  </span>
                                )}
                              </>
                            ) : isShopDesktopOnline ? (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-amber-700">🟡 App Open (Scan QR)</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                <span className="text-slate-600">⚪ Disconnected / Offline</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={refreshConnectionStatus}
                            title="Refresh Live Status"
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                          >
                            <RefreshCw className={`w-4 h-4 ${isLoadingShopPairing ? "animate-spin" : ""}`} />
                          </button>
                          {isShopWaConnected && (
                            <button
                              type="button"
                              disabled={isDisconnectingWa}
                              onClick={handleDisconnectDesktopWa}
                              title="Disconnect WhatsApp from Desktop Assistant"
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              Disconnect
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Online & Ready Confirmation Banner */}
                      {isShopDesktopOnline && isShopWaConnected && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="text-xs font-bold leading-relaxed">
                            <strong>Device Connected & Ready:</strong> This counter's Desktop Assistant is online with WhatsApp authenticated. You can select "Optical Manager Desktop Assistant" below to dispatch invoices silently in 1-click.
                          </div>
                        </div>
                      )}

                      {/* App Running but QR Scan Required Banner */}
                      {isShopDesktopOnline && !isShopWaConnected && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                          <QrCode className="w-5 h-5 text-amber-600 shrink-0" />
                          <div className="text-xs font-bold leading-relaxed">
                            <strong>Desktop Assistant Running:</strong> The app is open on this counter PC. Please scan the QR code inside the Desktop Assistant window using your WhatsApp mobile app (Linked Devices) to activate 1-click messaging.
                          </div>
                        </div>
                      )}

                      {/* Store Pairing Key Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                            Branch Store Pairing Key
                          </label>
                          <span className="text-[10px] text-slate-400 font-bold">
                            Enter this in the Desktop Assistant app
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={isLoadingShopPairing ? "Generating pairing key..." : shopPairingKey}
                            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-800 font-mono text-xs font-bold rounded-xl select-all outline-none focus:border-blue-500 shadow-2xs"
                          />
                          <button
                            type="button"
                            disabled={isLoadingShopPairing || !shopPairingKey}
                            onClick={handleCopyShopPairingKey}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            {hasCopiedShopKey ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Branch Key</span>
                              </>
                            )}
                          </button>
                          <a
                            href="/downloads/Optical-Manager-WhatsApp-Assistant-Setup.exe"
                            download="Optical-Manager-WhatsApp-Assistant-Setup.exe"
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download App (.exe)</span>
                          </a>
                        </div>
                      </div>

                      {/* 3 Quick Setup Steps */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-slate-600 font-semibold">
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">1</span>
                          <span>Download & install app on this counter PC</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">2</span>
                          <span>Paste this Branch Pairing Key</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">3</span>
                          <span>Scan WhatsApp QR code once</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: THREE DISPATCH METHOD TOGGLES */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Radio className="w-4 h-4 text-blue-600" /> WhatsApp Dispatch Channel
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Select how Optical Manager sends invoices, receipts, and order readiness notices to customers.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5">
                        {/* TOGGLE 1: WHATSAPP WEB */}
                        <div
                          onClick={() => handleSelectDispatchMode("whatsapp_web")}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                            whatsappDispatchMode === "whatsapp_web"
                              ? "bg-blue-50/40 border-blue-600 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black ${
                              whatsappDispatchMode === "whatsapp_web"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              <Globe className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                  Send through WhatsApp Web (Browser)
                                </span>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                  Default • Always Available
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Opens customer chat directly in WhatsApp Web or desktop browser with the pre-filled template and invoice link. Zero desktop setup required.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <input
                              type="radio"
                              name="whatsappDispatchMode"
                              checked={whatsappDispatchMode === "whatsapp_web"}
                              onChange={() => handleSelectDispatchMode("whatsapp_web")}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* TOGGLE 2: OPTICAL MANAGER DESKTOP ASSISTANT */}
                        <div
                          onClick={() => handleSelectDispatchMode("desktop_assistant")}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer ${
                            whatsappDispatchMode === "desktop_assistant"
                              ? "bg-blue-50/40 border-blue-600 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black ${
                              whatsappDispatchMode === "desktop_assistant"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              <Zap className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                  Send through Optical Manager Desktop Assistant
                                </span>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                  1-Click Background Dispatch
                                </span>
                                {isShopDesktopOnline ? (
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Connected
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                    App Offline (Will Queue)
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Silently dispatches WhatsApp messages directly from this counter's WhatsApp in the background. Staff never leaves the checkout screen.
                              </p>
                              {!isShopDesktopOnline && (
                                <div className="pt-0.5 flex items-center gap-1.5 text-[11px] text-amber-700 font-bold">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Desktop Assistant is not running yet. Messages will be queued and sent once connected.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <input
                              type="radio"
                              name="whatsappDispatchMode"
                              checked={whatsappDispatchMode === "desktop_assistant"}
                              onChange={() => handleSelectDispatchMode("desktop_assistant")}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* TOGGLE 3: WHATSAPP OFFICIAL CLOUD API */}
                        <div
                          onClick={() => {
                            const isConfigured = Boolean(shop?.settings?.metaCloudApi?.isConfigured);
                            if (isConfigured) {
                              handleSelectDispatchMode("official_api");
                            } else {
                              toast.info("WhatsApp Official Cloud API is not configured for this branch yet.");
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                            !shop?.settings?.metaCloudApi?.isConfigured
                              ? "bg-slate-50/70 border-slate-200 opacity-80 cursor-not-allowed"
                              : whatsappDispatchMode === "official_api"
                              ? "bg-blue-50/40 border-blue-600 shadow-xs cursor-pointer"
                              : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black ${
                              whatsappDispatchMode === "official_api"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                  WhatsApp Official Cloud API (Meta API)
                                </span>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                                  Meta Cloud API • Enterprise
                                </span>
                                {shop?.settings?.metaCloudApi?.isConfigured ? (
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                    Configured
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                                    Not Configured
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Deliver utility messages through Meta's verified WhatsApp Cloud API gateway with verified business green tick.
                              </p>
                              {!shop?.settings?.metaCloudApi?.isConfigured && (
                                <div className="pt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Meta Cloud API is not configured for this branch. Keep disabled or contact administrator.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <input
                              type="radio"
                              name="whatsappDispatchMode"
                              disabled={!shop?.settings?.metaCloudApi?.isConfigured}
                              checked={whatsappDispatchMode === "official_api"}
                              onChange={() => {
                                if (shop?.settings?.metaCloudApi?.isConfigured) {
                                  handleSelectDispatchMode("official_api");
                                }
                              }}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 2B: WhatsApp Templates Customizer */}
                {activeSubTab === "whatsapp" && (
                  <div className="space-y-6">
                    {/* Top banner pointing to WhatsApp Utility */}
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold">
                            Active Dispatch Channel:{" "}
                            <span className="text-indigo-600 font-extrabold">
                              {whatsappDispatchMode === "desktop_assistant"
                                ? "Desktop Assistant (1-Click Local Engine)"
                                : whatsappDispatchMode === "official_api"
                                ? "WhatsApp Official Cloud API"
                                : "WhatsApp Web (Browser Direct)"}
                            </span>
                          </div>
                          <p className="text-[11px] text-indigo-700/80">
                            To connect your counter PC or switch between WhatsApp Web and Desktop Assistant, open the WhatsApp Utility tab.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenView("whatsapp-utility")}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shrink-0 transition-colors shadow-2xs cursor-pointer"
                      >
                        Manage Utility &rarr;
                      </button>
                    </div>

                    <div className="space-y-1 pt-2">
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
                          { id: "order_form_sent", label: "Order Form Sent", desc: "Order booking & Rx notice" },
                          { id: "invoice_sent", label: "Invoice Sent", desc: "Digital bill & tax invoice" },
                          { id: "prescription_sent", label: "Prescription Sent", desc: "Clinical eye Rx details" },
                          { id: "payment_reminder", label: "Payment Reminder", desc: "Outstanding balance alert" },
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
                              {selectedTemplateId.replace(/_/g, " ")}
                            </span>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Configure status and content</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const rec = DEFAULT_WHATSAPP_TEMPLATES[selectedTemplateId];
                                if (rec) {
                                  setWhatsappTemplates({
                                    ...whatsappTemplates,
                                    [selectedTemplateId]: {
                                      ...whatsappTemplates[selectedTemplateId],
                                      template: rec.template,
                                    },
                                  });
                                  toast.success(`Reset "${rec.label}" to recommended template.`);
                                }
                              }}
                              className="text-[9px] font-black uppercase px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                              title="Reset this template to the recommended optical industry copy"
                            >
                              Reset
                            </button>
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
                              { code: "receipt_number", label: "Order Form #" },
                              { code: "amount", label: "Total Amount" },
                              { code: "amount_paid", label: "Amount Paid" },
                              { code: "balance_due", label: "Balance Due" },
                              { code: "payment_method", label: "Payment Method" },
                              { code: "fulfillment_status", label: "Delivery Status" },
                              { code: "estimated_delivery", label: "Est. Delivery" },
                              { code: "order_number", label: "Order Number" },
                              { code: "order_form_url", label: "Order Form URL" },
                              { code: "invoice_url", label: "Invoice URL" },
                              { code: "re_sph", label: "RE Sphere" },
                              { code: "re_cyl", label: "RE Cyl" },
                              { code: "re_axis", label: "RE Axis" },
                              { code: "re_add", label: "RE Add" },
                              { code: "le_sph", label: "LE Sphere" },
                              { code: "le_cyl", label: "LE Cyl" },
                              { code: "le_axis", label: "LE Axis" },
                              { code: "le_add", label: "LE Add" },
                              { code: "pd", label: "PD (mm)" },
                              { code: "doctor_name", label: "Doctor" },
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
                                  receipt_number: "OF-2026-0812",
                                  amount: "Rs. 1,899/-",
                                  amount_paid: "Rs. 1,000/-",
                                  balance_due: "Rs. 899/-",
                                  payment_method: "UPI",
                                  fulfillment_status: "READY",
                                  estimated_delivery: "July 12, 2026",
                                  order_number: "ORD-9824",
                                  order_form_url: "https://opt.mgr/share/receipt/0812",
                                  invoice_url: "https://opt.mgr/share/invoice/0812",
                                  re_sph: "-1.50",
                                  re_cyl: "-0.50",
                                  re_axis: "90°",
                                  re_add: "+2.00",
                                  le_sph: "-1.75",
                                  le_cyl: "-0.25",
                                  le_axis: "85°",
                                  le_add: "+2.00",
                                  pd: "63",
                                  doctor_name: "Dr. Sharma",
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
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Control automated notification triggers via system email service</p>
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

                {/* Sub-tab 2C: Google Reviews & Instagram Social Engagement */}
                {activeSubTab === "social-links" && (() => {
                  const detectedIg = normalizeInstagramUrl(socialReviewLinks.instagram?.url);
                  const isGoogleActive = Boolean(socialReviewLinks.googleReview?.enabled && socialReviewLinks.googleReview?.url?.trim());
                  const isInstagramActive = Boolean(socialReviewLinks.instagram?.enabled && socialReviewLinks.instagram?.url?.trim());

                  return (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-pink-50/80 border border-slate-200/90 rounded-2xl shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center gap-1 shrink-0">
                            <GoogleColorIcon className="w-4 h-4" />
                            <InstagramColorIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                Google Reviews &amp; Instagram Engagement
                              </h4>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-[#0a52c3]">
                                Shared Documents
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Display stylish interactive engagement buttons on shared customer invoices and receipts to boost 5-star Google ratings and social followers.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Google Review Card */}
                        <div className={`rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all border ${
                          socialReviewLinks.googleReview?.enabled
                            ? "bg-white border-blue-200/90 shadow-2xs hover:shadow-xs"
                            : "bg-slate-50/60 border-slate-200/80"
                        }`}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-2xs">
                                  <GoogleColorIcon className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <span className="block text-xs font-black text-slate-900">Google Review Link</span>
                                  <span className="block text-[10px] text-slate-500 font-medium">Direct customers to rate your optical practice</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 transition-colors ${
                                  socialReviewLinks.googleReview?.enabled
                                    ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                                    : "bg-slate-100 border-slate-200 text-slate-500"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${
                                    socialReviewLinks.googleReview?.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                  }`} />
                                  {socialReviewLinks.googleReview?.enabled ? "Active" : "Disabled"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateGoogleReview({ enabled: !socialReviewLinks.googleReview?.enabled })}
                                  className={`w-11 h-6 rounded-full p-0.5 transition-all cursor-pointer duration-300 ${
                                    socialReviewLinks.googleReview?.enabled ? "bg-[#2563eb]" : "bg-slate-200"
                                  }`}
                                  title={socialReviewLinks.googleReview?.enabled ? "Click to disable Google Reviews" : "Click to enable Google Reviews"}
                                >
                                  <div
                                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                                      socialReviewLinks.googleReview?.enabled ? "translate-x-5" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide flex items-center justify-between">
                                <span>Google Review Shortlink</span>
                                {socialReviewLinks.googleReview?.url?.trim() && (
                                  <a
                                    href={socialReviewLinks.googleReview.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                  >
                                    Test Link <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </label>
                              <input
                                type="url"
                                value={socialReviewLinks.googleReview?.url || ""}
                                onChange={(e) => updateGoogleReview({ url: e.target.value.trim() })}
                                placeholder="https://g.page/r/.../review or https://maps.app.goo.gl/..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                              />
                              <p className="text-[10px] text-slate-400 font-medium">
                                Get your shortlink from Google Business Profile Manager &rarr; "Ask for reviews". Typing a link auto-enables this button.
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                                Display On Document Types:
                              </span>
                              <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={socialReviewLinks.googleReview?.showOnInvoices !== false}
                                    onChange={(e) => updateGoogleReview({ showOnInvoices: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  Tax Invoices
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={socialReviewLinks.googleReview?.showOnReceipts !== false}
                                    onChange={(e) => updateGoogleReview({ showOnReceipts: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  Order Forms / Receipts
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Instagram Profile Card */}
                        <div className={`rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all border ${
                          socialReviewLinks.instagram?.enabled
                            ? "bg-white border-pink-200/90 shadow-2xs hover:shadow-xs"
                            : "bg-slate-50/60 border-slate-200/80"
                        }`}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-2xs">
                                  <InstagramColorIcon className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <span className="block text-xs font-black text-slate-900">Instagram Profile</span>
                                  <span className="block text-[10px] text-slate-500 font-medium">Invite customers to follow your store page</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 transition-colors ${
                                  socialReviewLinks.instagram?.enabled
                                    ? "bg-pink-50 border-pink-250 text-pink-700"
                                    : "bg-slate-100 border-slate-200 text-slate-500"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${
                                    socialReviewLinks.instagram?.enabled ? "bg-pink-500 animate-pulse" : "bg-slate-400"
                                  }`} />
                                  {socialReviewLinks.instagram?.enabled ? "Active" : "Disabled"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateInstagram({ enabled: !socialReviewLinks.instagram?.enabled })}
                                  className={`w-11 h-6 rounded-full p-0.5 transition-all cursor-pointer duration-300 ${
                                    socialReviewLinks.instagram?.enabled ? "bg-[#d6249f]" : "bg-slate-200"
                                  }`}
                                  title={socialReviewLinks.instagram?.enabled ? "Click to disable Instagram" : "Click to enable Instagram"}
                                >
                                  <div
                                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                                      socialReviewLinks.instagram?.enabled ? "translate-x-5" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide flex items-center justify-between">
                                <span>Profile Handle or URL</span>
                                {socialReviewLinks.instagram?.url?.trim() && (
                                  <a
                                    href={detectedIg.url || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-pink-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                  >
                                    Test Link <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </label>
                              <input
                                type="text"
                                value={socialReviewLinks.instagram?.url || ""}
                                onChange={(e) => updateInstagram({ url: e.target.value.trim() })}
                                placeholder="@yourstore or https://instagram.com/yourstore"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-pink-500 focus:bg-white transition-colors"
                              />
                              {detectedIg.handle ? (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detected:</span>
                                  <span className="text-[11px] font-extrabold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200/70 inline-flex items-center gap-1">
                                    <InstagramColorIcon className="w-3 h-3" /> {detectedIg.handle}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Type your handle (e.g. @cooloptics) or full profile URL. Typing a link auto-enables this button.
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                                Display On Document Types:
                              </span>
                              <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={socialReviewLinks.instagram?.showOnInvoices !== false}
                                    onChange={(e) => updateInstagram({ showOnInvoices: e.target.checked })}
                                    className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                                  />
                                  Tax Invoices
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={socialReviewLinks.instagram?.showOnReceipts !== false}
                                    onChange={(e) => updateInstagram({ showOnReceipts: e.target.checked })}
                                    className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                                  />
                                  Order Forms / Receipts
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Preview Section with Mode Switcher */}
                      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-0.5">
                            <span className="block text-xs font-bold text-slate-800">
                              Live Customer Document Preview
                            </span>
                            <span className="block text-[11px] text-slate-500 font-medium">
                              Interactive preview of how buttons appear to customers above shared documents:
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-200/70 p-0.5 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setSocialPreviewMode("INVOICE")}
                              className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer ${
                                socialPreviewMode === "INVOICE"
                                  ? "bg-white text-slate-900 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Tax Invoice
                            </button>
                            <button
                              type="button"
                              onClick={() => setSocialPreviewMode("RECEIPT")}
                              className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer ${
                                socialPreviewMode === "RECEIPT"
                                  ? "bg-white text-slate-900 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Order Form / Receipt
                            </button>
                          </div>
                        </div>

                        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center min-h-[95px]">
                          {(!isGoogleActive && !isInstagramActive) ? (
                            <div className="text-center py-2 space-y-1">
                              <p className="text-xs font-bold text-slate-700">No Engagement Buttons Currently Active</p>
                              <p className="text-[11px] text-slate-400">
                                Enter your Google shortlink or Instagram profile above and ensure the toggle is set to <span className="font-extrabold text-emerald-600">Active</span> to display pills on shared invoices.
                              </p>
                            </div>
                          ) : (
                            <SocialReviewPills
                              settings={socialReviewLinks}
                              mode={socialPreviewMode}
                              storeName={profileName || shop?.name || "Your Store"}
                              forcePreview={true}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        <button 
                          type="button" 
                          onClick={() => handleSaveConfig("socialReviewLinks", socialReviewLinks, "Google and Instagram links saved successfully.")}
                          disabled={isPending}
                          className="px-5 py-2.5 bg-[#0a52c3] hover:bg-[#0842a0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Save Google & Instagram Settings"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
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

                {/* Product Categories GST Rates Master Matrix */}
                <CategoryGstRatesSettings />

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

        </div>
      )}
      
    </div>
  );
}
