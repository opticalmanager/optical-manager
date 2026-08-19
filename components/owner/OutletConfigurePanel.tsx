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
  ShieldAlert,
  Sparkles,
  Info,
  Edit2,
  Trash2,
  LayoutGrid,
  ShoppingCart,
  RotateCcw,
  Users,
  CalendarDays,
  BarChart2,
  TrendingUp,
  Settings,
  HelpCircle,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateShopDetails,
  createShopStaffAccount,
  updateStaffPermissions,
  updateStaffPasswordById,
  toggleStaffStatus,
  deleteStaffAccount,
  type ShopWithStaffData,
  type StaffProfileInfo,
} from "@/services/shop-manager.service";
import { accessShopConsoleAction } from "@/actions/auth.actions";
import { defaultFullPermissions, type ModulePermissions } from "@/db/schema/profiles";

interface OutletConfigurePanelProps {
  shop: ShopWithStaffData;
  onClose: () => void;
  onShopUpdated: (updatedShop: ShopWithStaffData) => void;
}

const ROLE_PRESETS = [
  {
    id: "STORE_ADMIN",
    name: "Store Admin",
    desc: "Full access to all store operations, settings, and business reports.",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    permissions: {
      dashboard: true,
      inventory: true,
      sales: true,
      returns: true,
      customers: true,
      appointments: true,
      analytics: true,
      reports: true,
      settings: true,
      support: true,
    },
  },
  {
    id: "SHOP_MANAGER",
    name: "Store Manager",
    desc: "Manage daily operations: sales, returns, stock, customers, appointments.",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    permissions: {
      dashboard: true,
      inventory: true,
      sales: true,
      returns: true,
      customers: true,
      appointments: true,
      analytics: true,
      reports: true,
      settings: false,
      support: true,
    },
  },
  {
    id: "OPTOMETRIST",
    name: "Optometrist / Doctor",
    desc: "Conduct eye examinations, manage patient records and appointments.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    permissions: {
      dashboard: true,
      inventory: false,
      sales: false,
      returns: false,
      customers: true,
      appointments: true,
      analytics: false,
      reports: false,
      settings: false,
      support: true,
    },
  },
  {
    id: "SALES_STAFF",
    name: "Sales & Billing Staff",
    desc: "Process POS checkout, sales orders, product returns, and view inventory.",
    badgeColor: "bg-blue-50 text-[#2563eb] border-blue-200",
    permissions: {
      dashboard: true,
      inventory: true,
      sales: true,
      returns: true,
      customers: true,
      appointments: false,
      analytics: false,
      reports: false,
      settings: false,
      support: true,
    },
  },
  {
    id: "CASHIER",
    name: "Cashier / Billing Counter",
    desc: "Create sales invoices, collect payments, and print receipts.",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    permissions: {
      dashboard: true,
      inventory: false,
      sales: true,
      returns: true,
      customers: true,
      appointments: false,
      analytics: false,
      reports: false,
      settings: false,
      support: false,
    },
  },
  {
    id: "CUSTOM",
    name: "Custom Role",
    desc: "Fine-tune individual permissions for custom store requirements.",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    permissions: {
      dashboard: true,
      inventory: false,
      sales: false,
      returns: false,
      customers: false,
      appointments: false,
      analytics: false,
      reports: false,
      settings: false,
      support: true,
    },
  },
];

const STORE_MODULES: {
  key: keyof ModulePermissions;
  label: string;
  desc: string;
  icon: any;
  color: string;
}[] = [
  { key: "dashboard", label: "Dashboard & KPIs", desc: "View main store metrics, quick stats, and daily summary", icon: LayoutGrid, color: "text-[#2563eb]" },
  { key: "inventory", label: "Inventory & Stock", desc: "Manage catalog, inward stock, price tags, and movements", icon: Store, color: "text-indigo-600" },
  { key: "sales", label: "Sales & Invoices", desc: "Create invoices, manage orders, and collect customer payments", icon: ShoppingCart, color: "text-emerald-600" },
  { key: "returns", label: "Product Returns", desc: "Process item returns, inspection, restocking, and credit notes", icon: RotateCcw, color: "text-amber-600" },
  { key: "customers", label: "Customers & Patients", desc: "Patient CRM, prescription records, and ophthalmic history", icon: Users, color: "text-blue-600" },
  { key: "appointments", label: "Appointments", desc: "Book and manage clinical eye test visits and testing queues", icon: CalendarDays, color: "text-purple-600" },
  { key: "analytics", label: "Business Analytics", desc: "Revenue analytics, sales trends, and category distribution", icon: BarChart2, color: "text-rose-600" },
  { key: "reports", label: "Reports & GST Exports", desc: "Export sales reports, inventory audits, and tax filings", icon: TrendingUp, color: "text-cyan-600" },
  { key: "settings", label: "Shop Settings", desc: "Store profile details, print templates, and branch rules", icon: Settings, color: "text-slate-600" },
  { key: "support", label: "Support & Help", desc: "Access technical assistance, guides, and ticket center", icon: HelpCircle, color: "text-amber-500" },
];

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

  // Staff List State
  const [staffList, setStaffList] = useState<StaffProfileInfo[]>(shop.staffList || (shop.manager ? [shop.manager] : []));

  // Modal States
  const [activeModal, setActiveModal] = useState<"add_role" | "edit_role" | "reset_password" | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfileInfo | null>(null);

  // Password visibility eye toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form States for Add / Edit Role
  const [formFullName, setFormFullName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formRolePreset, setFormRolePreset] = useState("SHOP_MANAGER");
  const [formCustomRoleName, setFormCustomRoleName] = useState("Store Manager");
  const [formPermissions, setFormPermissions] = useState<ModulePermissions>({ ...defaultFullPermissions });

  // Reset Password State
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
      const res = await accessShopConsoleAction(shop.id);
      if (res?.success) {
        toast.success("Redirecting...", { id: "shop-console" });
        window.location.href = "/shop/dashboard";
      } else {
        toast.error("Failed to open shop console.", { id: "shop-console" });
        setIsConsoleLoading(false);
      }
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
        const updated: ShopWithStaffData = {
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

  // Preset Selection Handler
  const handleSelectPreset = (presetId: string) => {
    setFormRolePreset(presetId);
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFormCustomRoleName(preset.name);
      setFormPermissions({ ...preset.permissions });
    }
  };

  // Toggle individual permission
  const handleTogglePermission = (key: keyof ModulePermissions) => {
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick Preset Handlers
  const handleSetAllPermissions = (value: boolean) => {
    const updated: ModulePermissions = {
      dashboard: value,
      inventory: value,
      sales: value,
      returns: value,
      customers: value,
      appointments: value,
      analytics: value,
      reports: value,
      settings: value,
      support: value,
    };
    setFormPermissions(updated);
  };

  // Open Add Role Modal
  const handleOpenAddRole = () => {
    setSelectedStaff(null);
    setFormFullName("");
    setFormEmail("");
    setFormPassword("");
    setFormConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    handleSelectPreset("SHOP_MANAGER");
    setActiveModal("add_role");
  };

  // Open Edit Role Modal
  const handleOpenEditRole = (staff: StaffProfileInfo) => {
    setSelectedStaff(staff);
    setFormFullName(staff.fullName);
    setFormEmail(staff.email);
    setFormCustomRoleName(staff.customRoleName || "Store Manager");
    setFormPermissions(staff.permissions ? { ...staff.permissions } : { ...defaultFullPermissions });
    setFormRolePreset("CUSTOM");
    setActiveModal("edit_role");
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (staff: StaffProfileInfo) => {
    setSelectedStaff(staff);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setActiveModal("reset_password");
  };

  // Submit Add Role Form
  const handleAddRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formFullName.trim()) {
      toast.error("Please enter the staff member's full name.");
      return;
    }

    if (!formEmail.trim() || !formEmail.includes("@")) {
      toast.error("Please enter a valid login email address.");
      return;
    }

    if (formPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (formPassword !== formConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createShopStaffAccount({
        shopId: shop.id,
        email: formEmail,
        password: formPassword,
        fullName: formFullName,
        customRoleName: formCustomRoleName || "Store Manager",
        permissions: formPermissions,
      });

      if (res.success && res.staff) {
        const updatedStaffList = [...staffList, res.staff];
        setStaffList(updatedStaffList);

        const updatedShop: ShopWithStaffData = {
          ...shop,
          staffCount: updatedStaffList.length,
          manager: shop.manager || res.staff,
          staffList: updatedStaffList,
        };
        onShopUpdated(updatedShop);

        toast.success(`Role account created for ${formFullName}!`);
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to create staff role.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Role Form
  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setIsSubmitting(true);
    try {
      const res = await updateStaffPermissions({
        profileId: selectedStaff.id,
        fullName: formFullName,
        customRoleName: formCustomRoleName,
        permissions: formPermissions,
      });

      if (res.success && res.staff) {
        const updatedStaffList = staffList.map((s) => (s.id === selectedStaff.id ? res.staff! : s));
        setStaffList(updatedStaffList);

        const updatedShop: ShopWithStaffData = {
          ...shop,
          manager: shop.manager?.id === selectedStaff.id ? res.staff : shop.manager,
          staffList: updatedStaffList,
        };
        onShopUpdated(updatedShop);

        toast.success(`Permissions updated for ${formFullName}!`);
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to update permissions.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error updating permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Reset Password Form
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

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
      const res = await updateStaffPasswordById({
        profileId: selectedStaff.id,
        newPassword: resetNewPassword,
      });

      if (res.success) {
        toast.success(`Password reset for ${selectedStaff.fullName}!`);
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to reset password.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error resetting password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Staff Active Status
  const handleToggleStatus = async (staff: StaffProfileInfo) => {
    const nextStatus = !staff.isActive;
    try {
      const res = await toggleStaffStatus({
        profileId: staff.id,
        isActive: nextStatus,
      });

      if (res.success) {
        const updatedStaffList = staffList.map((s) =>
          s.id === staff.id ? { ...s, isActive: nextStatus } : s
        );
        setStaffList(updatedStaffList);

        const updatedShop: ShopWithStaffData = {
          ...shop,
          staffList: updatedStaffList,
        };
        onShopUpdated(updatedShop);
        toast.success(`${staff.fullName} is now ${nextStatus ? "Active" : "Inactive"}`);
      } else {
        toast.error(res.error || "Failed to update status.");
      }
    } catch (err) {
      toast.error("Error updating account status.");
    }
  };

  // Delete Staff Account
  const handleDeleteStaff = async (staff: StaffProfileInfo) => {
    if (!confirm(`Are you sure you want to remove ${staff.fullName} (${staff.email}) from this outlet?`)) {
      return;
    }

    try {
      const res = await deleteStaffAccount({ profileId: staff.id });
      if (res.success) {
        const updatedStaffList = staffList.filter((s) => s.id !== staff.id);
        setStaffList(updatedStaffList);

        const updatedShop: ShopWithStaffData = {
          ...shop,
          staffCount: updatedStaffList.length,
          manager: updatedStaffList[0] || null,
          staffList: updatedStaffList,
        };
        onShopUpdated(updatedShop);
        toast.success(`Staff account removed.`);
      } else {
        toast.error(res.error || "Failed to delete account.");
      }
    } catch (err) {
      toast.error("Error deleting staff account.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-lg">Configure Outlet — {shop.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  shop.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
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
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                activeTab === "access_roles"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Access & Roles</span>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                activeTab === "access_roles" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {staffList.length}
              </span>
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
                      Configure manager & staff accounts, assign roles, and toggle granular navigation module permissions.
                    </p>
                  </div>                  <button
                    type="button"
                    onClick={handleOpenAddRole}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ New Staff Role</span>
                  </button>
                </div>

                {/* Staff Profiles List */}
                {staffList.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200/80 p-6">
                    <KeyRound className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <h4 className="text-sm font-bold text-slate-800">No Staff Roles Configured</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Create store manager, optometrist, or cashier roles to grant staff access to this outlet.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddRole}
                      className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors"
                    >
                      + Create First Staff Role
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffList.map((staff) => {
                      const permissionsObj = staff.permissions || defaultFullPermissions;
                      const activeModulesCount = Object.values(permissionsObj).filter(Boolean).length;

                      return (
                        <div
                          key={staff.id}
                          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
                        >
                          {/* Staff Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold flex items-center justify-center text-sm shrink-0">
                                {staff.fullName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-sm text-slate-900">
                                    {staff.fullName}
                                  </h4>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {staff.customRoleName || "Store Manager"}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    staff.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}>
                                    {staff.isActive ? "Active" : "Inactive"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  Login: <strong className="text-slate-700">{staff.email}</strong>
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditRole(staff)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Edit Permissions</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenResetPassword(staff)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                                <span>Reset Password</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(staff)}
                                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                                  staff.isActive
                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                }`}
                                title={staff.isActive ? "Deactivate Account" : "Activate Account"}
                              >
                                {staff.isActive ? "Deactivate" : "Activate"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(staff)}
                                className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Staff Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Active Module Permissions Chips */}
                          <div className="pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                Active Module Permissions ({activeModulesCount} of {STORE_MODULES.length})
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {STORE_MODULES.map((mod) => {
                                const isAllowed = permissionsObj[mod.key] ?? true;
                                return (
                                  <span
                                    key={mod.key}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all ${
                                      isAllowed
                                        ? "bg-emerald-50/80 text-emerald-700 border-emerald-200"
                                        : "bg-slate-50 text-slate-400 border-slate-200/60 opacity-60 line-through"
                                    }`}
                                  >
                                    <mod.icon className="w-3 h-3" />
                                    <span>{mod.label}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD OR EDIT ROLE ACCOUNT WITH PERMISSION SWITCHES               */}
      {/* ========================================================================= */}
      {(activeModal === "add_role" || activeModal === "edit_role") && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {activeModal === "add_role" ? "Create Outlet Staff Role" : `Edit Permissions — ${formFullName}`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {activeModal === "add_role"
                      ? "Assign staff credentials and configure granular navigation access."
                      : "Modify custom role title and store module access permissions."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 font-bold transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={activeModal === "add_role" ? handleAddRoleSubmit : handleEditRoleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {/* Basic Account Credentials */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Staff Account Credentials
                </h4>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="e.g. Rahul Verma"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Login Email ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={activeModal === "edit_role"}
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. rahul.billing@opticalstore.com"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>

                {activeModal === "add_role" && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Password (8+ chars) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-9 pl-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={formConfirmPassword}
                          onChange={(e) => setFormConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-9 pl-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Presets */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Role Template & Custom Title
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetAllPermissions(true)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleSetAllPermissions(false)}
                      className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer bg-transparent border-none p-0"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ROLE_PRESETS.map((preset) => {
                    const isSelected = formRolePreset === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/20 shadow-xs"
                            : "border-slate-200/80 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-extrabold text-slate-900 block">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                            {preset.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Custom Display Role Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomRoleName}
                    onChange={(e) => setFormCustomRoleName(e.target.value)}
                    placeholder="e.g. Senior Optometrist, Cashier..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Granular Module Permission Switches */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Granular Store Navigation & Feature Access
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle individual modules ON or OFF. Disabled items will be hidden from this staff member's navigation panel and direct access blocked.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  {STORE_MODULES.map((mod) => {
                    const isEnabled = formPermissions[mod.key] ?? true;
                    return (
                      <div
                        key={mod.key}
                        onClick={() => handleTogglePermission(mod.key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isEnabled
                            ? "border-indigo-200 bg-indigo-50/20 shadow-2xs"
                            : "border-slate-200 bg-slate-50/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isEnabled ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-400"
                          }`}>
                            <mod.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-slate-900 block leading-tight truncate">
                              {mod.label}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                              {mod.desc}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center shrink-0 p-0.5 ${
                          isEnabled ? "bg-indigo-600" : "bg-slate-300"
                        }`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            isEnabled ? "translate-x-4" : "translate-x-0"
                          }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{activeModal === "add_role" ? "Create Staff Role" : "Save Permissions"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESET PASSWORD                                                   */}
      {/* ========================================================================= */}
      {activeModal === "reset_password" && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Reset Staff Password</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{selectedStaff.fullName} ({selectedStaff.email})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">New Password (8+ chars)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pr-10 pl-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    placeholder="Confirm new password"
                    className="w-full pr-10 pl-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


