"use client";

import React, { useState } from "react";
import { Store, Mail, Lock, Phone, MapPin, Edit2, ShieldAlert, KeyRound, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  updateShopDetails,
  updateShopManagerEmail,
  updateShopManagerPassword,
  createShopManagerCredentials,
} from "@/services/shop-manager.service";
import { startImpersonatingShopAction } from "@/actions/auth.actions";

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

interface ShopManagerSettingsProps {
  initialShops: ShopWithManager[];
}

export function ShopManagerSettings({ initialShops }: ShopManagerSettingsProps) {
  const [shopsList, setShopsList] = useState<ShopWithManager[]>(initialShops);
  const [selectedShop, setSelectedShop] = useState<ShopWithManager | null>(null);
  const [activeModal, setActiveModal] = useState<"edit_shop" | "change_password" | "change_email" | "create_credentials" | null>(null);
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewOutletLoading, setIsViewOutletLoading] = useState<string | null>(null);

  const handleViewOutlet = async (shopId: string) => {
    if (shopId.startsWith("mock-")) {
      toast.error("Demo branches cannot be viewed. Create a real shop branch to test this feature.");
      return;
    }

    setIsViewOutletLoading(shopId);
    try {
      toast.loading("Initiating shop impersonation context...", { id: "view-outlet" });
      await startImpersonatingShopAction(shopId);
      toast.success("Redirecting to outlet dashboard...", { id: "view-outlet" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to impersonate shop branch.", { id: "view-outlet" });
      setIsViewOutletLoading(null);
    }
  };

  // Form states
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");

  const [managerEmail, setManagerEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Create credentials form states
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");

  const handleOpenEditShop = (shop: ShopWithManager) => {
    setSelectedShop(shop);
    setShopName(shop.name);
    setShopPhone(shop.phone || "");
    setShopAddress(shop.address || "");
    setActiveModal("edit_shop");
  };

  const handleOpenChangeEmail = (shop: ShopWithManager) => {
    setSelectedShop(shop);
    setManagerEmail(shop.manager?.email || shop.email || "");
    setActiveModal("change_email");
  };

  const handleOpenChangePassword = (shop: ShopWithManager) => {
    setSelectedShop(shop);
    setNewPassword("");
    setConfirmPassword("");
    setActiveModal("change_password");
  };

  const handleOpenCreateCredentials = (shop: ShopWithManager) => {
    setSelectedShop(shop);
    setCreateEmail(shop.email || "");
    setCreatePassword("");
    setCreateConfirmPassword("");
    setActiveModal("create_credentials");
  };

  const handleCreateCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    if (!createEmail.trim() || !createEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (createPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (createPassword !== createConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createShopManagerCredentials(
        selectedShop.id,
        createEmail,
        createPassword
      );

      if (res.success && res.manager) {
        setShopsList((prev) =>
          prev.map((s) =>
            s.id === selectedShop.id
              ? {
                  ...s,
                  email: createEmail,
                  manager: res.manager!,
                }
              : s
          )
        );
        toast.success("Shop manager credentials created successfully!");
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

  const handleEditShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    if (!shopName.trim()) {
      toast.error("Shop name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateShopDetails(selectedShop.id, {
        name: shopName,
        phone: shopPhone,
        address: shopAddress,
      });

      if (res.success) {
        setShopsList((prev) =>
          prev.map((s) =>
            s.id === selectedShop.id
              ? { ...s, name: shopName, phone: shopPhone, address: shopAddress }
              : s
          )
        );
        toast.success("Shop details updated successfully!");
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to update shop details.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    if (!managerEmail.trim() || !managerEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateShopManagerEmail(selectedShop.id, managerEmail);

      if (res.success) {
        setShopsList((prev) =>
          prev.map((s) =>
            s.id === selectedShop.id
              ? {
                  ...s,
                  email: managerEmail,
                  manager: s.manager ? { ...s.manager, email: managerEmail } : null,
                }
              : s
          )
        );
        toast.success("Shop manager login email updated successfully!");
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to update login email.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateShopManagerPassword(selectedShop.id, newPassword);

      if (res.success) {
        toast.success("Shop manager password changed successfully!");
        setActiveModal(null);
      } else {
        toast.error(res.error || "Failed to update password.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-base font-bold text-slate-900">
          Shops & Manager Accounts
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Manage your physical store locations, edit shop info, and configure shop manager login credentials.
        </p>
      </div>

      <div className="space-y-6">
        {shopsList.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Store className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">No shops created yet</p>
            <p className="text-xs text-slate-400">Add a shop to start managing inventory and sales.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shopsList.map((shop) => (
              <div
                key={shop.id}
                className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                {/* Shop Card Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-bold text-slate-900 text-sm leading-none">{shop.name}</h4>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                          shop.isActive
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                            : "bg-rose-50 border border-rose-200 text-rose-700"
                        }`}>
                          {shop.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">Shop ID: {shop.id.substring(0, 8)}...</p>
                    </div>
                    <button
                      onClick={() => handleOpenEditShop(shop)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Shop Info Details */}
                <div className="p-5 space-y-4 flex-1">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{shop.address || <span className="text-slate-400 italic">No address provided</span>}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{shop.phone || <span className="text-slate-400 italic">No phone number</span>}</span>
                    </div>
                  </div>

                  {/* Manager Login Info Box */}
                  <div className="p-4 rounded-lg bg-indigo-50/30 border border-indigo-100/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-100/30 pb-2">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                        Manager Credentials
                      </span>
                    </div>
                    
                    {shop.manager ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Login ID (Email)</span>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800 break-all">{shop.manager.email}</span>
                            <button
                              onClick={() => handleOpenChangeEmail(shop)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer ml-2 whitespace-nowrap"
                            >
                              Edit Email
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1 border-t border-indigo-100/30">
                          <button
                            onClick={() => handleOpenChangePassword(shop)}
                            className="w-1/2 text-center py-1.5 px-3 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[10px] transition-all cursor-pointer"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleViewOutlet(shop.id)}
                            disabled={isViewOutletLoading === shop.id}
                            className="w-1/2 text-center py-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            {isViewOutletLoading === shop.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ExternalLink className="w-3 h-3" />
                            )}
                            <span>View Outlet</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 py-1">
                        <p className="text-xs text-slate-500 font-medium">
                          No login credentials configured for this shop yet.
                        </p>
                        <button
                          onClick={() => handleOpenCreateCredentials(shop)}
                          className="w-full text-center py-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Create Credentials</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Edit Shop Details */}
      {activeModal === "edit_shop" && selectedShop && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" />
                Edit Shop Details
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditShopSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Address
                </label>
                <textarea
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Login Email */}
      {activeModal === "change_email" && selectedShop && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                Change Login Email
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEmailSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  Changing this email updates both the database record and the shop manager&apos;s credentials in Supabase Auth. The manager must use this new email to log in next time.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  New Manager Email (Login ID)
                </label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Update Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Change/Reset Password */}
      {activeModal === "change_password" && selectedShop && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                Reset Manager Password
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  As the owner, you can directly override the password for the shop manager. They will be logged out and will need to log in with this new password.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Create Login Credentials */}
      {activeModal === "create_credentials" && selectedShop && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                Create Manager Credentials
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCredentialsSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-950 font-medium leading-relaxed">
                  Configure new credentials for this shop. This will register a shop manager account in Supabase Auth and link it in the database.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Manager Email (Login ID)
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. manager@shop.com"
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Password
                </label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={createConfirmPassword}
                  onChange={(e) => setCreateConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Create Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
