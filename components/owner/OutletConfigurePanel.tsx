"use client";

import React, { useState } from "react";
import {
  Store,
  Mail,
  Phone,
  MapPin,
  KeyRound,
  ExternalLink,
  Plus,
  User,
  Loader2,
  X,
  Lock,
  Building2,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateShopDetails,
  updateShopManagerEmail,
  updateShopManagerPassword,
  createShopManagerCredentials,
} from "@/services/shop-manager.service";
import { accessShopConsoleAction } from "@/actions/auth.actions";

interface ManagerInfo {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

interface ShopWithManager {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  manager: ManagerInfo | null;
}

interface OutletConfigurePanelProps {
  shop: ShopWithManager;
  onClose: () => void;
  onShopUpdated: (updatedShop: ShopWithManager) => void;
}

export function OutletConfigurePanel({
  shop,
  onClose,
  onShopUpdated,
}: OutletConfigurePanelProps) {
  // Left Navigation Sidebar Tab State
  const [activeTab, setActiveTab] = useState<"shop_details" | "access_roles">("shop_details");

  // Shop details form state
  const [shopName, setShopName] = useState(shop.name);
  const [shopPhone, setShopPhone] = useState(shop.phone || "");
  const [shopEmail, setShopEmail] = useState(shop.email || "");
  const [shopAddress, setShopAddress] = useState(shop.address || "");
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Modal Overlay States inside Access & Roles
  const [activeModal, setActiveModal] = useState<"add_role" | "edit_email" | "reset_password" | null>(null);

  // Password visibility eye toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showManagerPasswordCard, setShowManagerPasswordCard] = useState(false);

  // Add Role Account Form States
  const [roleType, setRoleType] = useState<"ADMIN" | "SHOP_MANAGER" | "STAFF">("SHOP_MANAGER");
  const [staffFullName, setStaffFullName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffConfirmPassword, setStaffConfirmPassword] = useState("");

  // Edit Email Form State
  const [editEmailValue, setEditEmailValue] = useState(shop.manager?.email || shop.email || "");

  // Reset Password Form State
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConsoleLoading, setIsConsoleLoading] = useState(false);

  // Handler: Open Shop Console
  const handleOpenConsole = async () => {
    if (shop.id.startsWith("mock-")) {
      toast.error("Demo branches cannot be accessed. Create a live shop branch to test console navigation.");
      return;
    }

    setIsConsoleLoading(true);
    try {
      toast.loading("Redirecting to shop console...", { id: "shop-console" });
      await accessShopConsoleAction(shop.id);
      toast.success("Redirecting...", { id: "shop-console" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open shop console.", { id: "shop-console" });
      setIsConsoleLoading(false);
    }
  };

  // Handler: Save Shop Details
  const handleSaveShopDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error("Shop name is required.");
      return;
    }

    setIsSavingDetails(true);
    try {
      const res = await updateShopDetails(shop.id, {
        name: shopName,
        phone: shopPhone,
        address: shopAddress,
      });

      if (res.success) {
        const updated = {
          ...shop,
          name: shopName,
          phone: shopPhone,
          address: shopAddress,
          email: shopEmail,
        };
        onShopUpdated(updated);
        toast.success("Shop details saved successfully!");
      } else {
        toast.error(res.error || "Failed to update shop details.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Handler: Add Role Account / Credentials
  const handleAddRoleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffEmail.trim() || !staffEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (staffPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (staffPassword !== staffConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createShopManagerCredentials(
        shop.id,
        staffEmail,
        staffPassword
      );

      if (res.success && res.manager) {
        const updatedManager: ManagerInfo = {
          id: res.manager.id,
          email: staffEmail,
          fullName: staffFullName.trim() || `${roleType} User`,
          isActive: true,
        };

        const updated = {
          ...shop,
          email: staffEmail,
          manager: updatedManager,
        };

        onShopUpdated(updated);
        toast.success(`${roleType.replace("_", " ")} credentials created successfully!`);
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to create manager credentials.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Update Manager Email
  const handleUpdateEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmailValue.trim() || !editEmailValue.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateShopManagerEmail(shop.id, editEmailValue);

      if (res.success) {
        const updated = {
          ...shop,
          email: editEmailValue,
          manager: shop.manager ? { ...shop.manager, email: editEmailValue } : null,
        };
        onShopUpdated(updated);
        toast.success("Manager login email updated!");
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to update email.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateShopManagerPassword(shop.id, resetNewPassword);

      if (res.success) {
        toast.success("Manager password updated successfully!");
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to reset password.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role scope explanation helper
  const getRoleDescription = () => {
    switch (roleType) {
      case "ADMIN":
        return "Full store administration, full stock override access, financial invoices, and store management settings.";
      case "SHOP_MANAGER":
        return "Complete store operations: sales, orders, customer records, inventory management, and digital receipts.";
      case "STAFF":
        return "Point-of-sale checkout, customer optical search, prescription entry, and bill printing.";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-lg">Configure Outlet — {shop.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {shop.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage shop-related information, credentials, and staff access roles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenConsole}
              disabled={isConsoleLoading}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isConsoleLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )}
              <span>Access Shop Console</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 font-bold transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Layout: Left Navigation Sidebar + Tab Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Navigation Sidebar */}
          <aside className="w-64 border-r border-slate-100 bg-slate-50/50 p-4 space-y-1.5 shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 block mb-2">
              Configuration Panels
            </span>

            <button
              onClick={() => setActiveTab("shop_details")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                activeTab === "shop_details"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Store className="w-4 h-4 shrink-0" />
              <span>Shop Details</span>
            </button>

            <button
              onClick={() => setActiveTab("access_roles")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                activeTab === "access_roles"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Access & Roles</span>
            </button>
          </aside>

          {/* Tab Content Area */}
          <main className="flex-1 p-6 sm:p-8 overflow-y-auto bg-white">
            
            {/* TAB 1: Shop Details */}
            {activeTab === "shop_details" && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Shop Related Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update store metadata, primary contact details, and physical location coordinates.
                  </p>
                </div>

                <form onSubmit={handleSaveShopDetails} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                      Shop Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                        Primary Contact Phone
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={shopPhone}
                          onChange={(e) => setShopPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                        Primary Contact Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          value={shopEmail}
                          onChange={(e) => setShopEmail(e.target.value)}
                          placeholder="shop@opticalstore.com"
                          className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                      Physical Store Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <textarea
                        rows={3}
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        placeholder="Complete shop address..."
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-none"
                      ></textarea>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingDetails}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isSavingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Shop Information</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: Access & Roles */}
            {activeTab === "access_roles" && (
              <div className="space-y-6">
                {/* Header Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Access Roles & User Credentials</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure manager & staff credentials assigned to this outlet.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setStaffEmail(shop.email || "");
                      setStaffFullName("");
                      setStaffPassword("");
                      setStaffConfirmPassword("");
                      setShowPassword(false);
                      setShowConfirmPassword(false);
                      setActiveModal("add_role");
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Role Account</span>
                  </button>
                </div>

                {/* Manager Credentials Card List */}
                {shop.manager ? (
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm">
                          <UserCheck className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{shop.manager.fullName || `${shop.name} Manager`}</h4>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800">
                            SHOP_MANAGER
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        CONFIGURED & ACTIVE
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      {/* Login ID (Email) */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          LOGIN ID (EMAIL)
                        </span>
                        <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
                          <span className="text-xs font-semibold text-slate-800 break-all">{shop.manager.email}</span>
                          <button
                            onClick={() => {
                              setEditEmailValue(shop.manager?.email || "");
                              setActiveModal("edit_email");
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer ml-2 whitespace-nowrap"
                          >
                            Edit Email
                          </button>
                        </div>
                      </div>

                      {/* Password Field with Eye Toggle */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          USER PASSWORD
                        </span>
                        <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {showManagerPasswordCard ? "Configured & Active" : "••••••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowManagerPasswordCard(!showManagerPasswordCard)}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer ml-2 p-1 transition-colors"
                            title={showManagerPasswordCard ? "Hide details" : "Inspect credentials state"}
                          >
                            {showManagerPasswordCard ? <EyeOff className="w-4 h-4 text-indigo-600" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex gap-3 pt-3 border-t border-slate-200/60">
                      <button
                        onClick={() => {
                          setResetNewPassword("");
                          setResetConfirmPassword("");
                          setShowPassword(false);
                          setShowConfirmPassword(false);
                          setActiveModal("reset_password");
                        }}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        Reset Password
                      </button>

                      <button
                        onClick={handleOpenConsole}
                        disabled={isConsoleLoading}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isConsoleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                        <span>Access Shop Console</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-4">
                    <KeyRound className="w-10 h-10 text-slate-300 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">No Manager Credentials Configured</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        This outlet does not have active login credentials assigned yet. Click below to add a role account.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveModal("add_role")}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Role Account</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL: + Add Role Account */}
      {activeModal === "add_role" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Add Role Account</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoleAccountSubmit} className="p-6 space-y-4">
              {/* Role Dropdown Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Select Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                >
                  <option value="ADMIN">Admin (Full Outlet Supervision)</option>
                  <option value="SHOP_MANAGER">Shop Manager (Operations & Orders)</option>
                  <option value="STAFF">Staff / Optician (Point of Sale & Checkout)</option>
                </select>
              </div>

              {/* Dynamic Permission Scope Box */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                  {getRoleDescription()}
                </p>
              </div>

              {/* Staff Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Staff Member Full Name
                </label>
                <input
                  type="text"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              {/* User Login Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Login Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@opticalstore.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              {/* Password Input with Eye Toggle */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full pr-10 pl-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input with Eye Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={staffConfirmPassword}
                      onChange={(e) => setStaffConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pr-10 pl-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Create Account Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Manager Email */}
      {activeModal === "edit_email" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Edit Manager Email</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmailSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">New Login Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmailValue}
                  onChange={(e) => setEditEmailValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password with Eye Toggle */}
      {activeModal === "reset_password" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Reset Account Password</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pr-10 pl-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pr-10 pl-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
