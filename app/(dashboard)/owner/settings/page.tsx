import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { getShopsWithManagers } from "@/services/shop-manager.service";
import { db } from "@/lib/drizzle";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Building2, User, CreditCard, Save, Store, Mail } from "lucide-react";
import { ShopManagerSettings } from "@/components/owner/ShopManagerSettings";

interface PageProps {
  searchParams: Promise<{ tab?: string }> | { tab?: string };
}

export default async function OwnerSettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Resolve search parameters safely for Next.js compatibility
  const resolvedParams = await (searchParams instanceof Promise ? searchParams : Promise.resolve(searchParams));
  const activeTab = resolvedParams?.tab ?? "org";

  const organization = await getOrganizationById(user.organizationId);

  const [dbSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, user.organizationId))
    .limit(1);

  const plan = dbSub?.plan ?? "TRIAL";

  let trialDaysLeft = 8;
  if (dbSub?.trialEndsAt) {
    const trialEnd = new Date(dbSub.trialEndsAt);
    const diffTime = trialEnd.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const formattedTrialEndsAt = dbSub?.trialEndsAt 
    ? new Date(dbSub.trialEndsAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : "8 days remaining";

  // Fetch shops with managers if active tab is "shops"
  let shopsData: any[] = [];
  if (activeTab === "shops") {
    const shopsRes = await getShopsWithManagers();
    if (shopsRes.success) {
      shopsData = shopsRes.data || [];
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Account & System Settings
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Modify your profile coordinates, organization details, manage billing plans, and control shop credentials.
        </p>
      </div>

      {/* Settings Panel Containers with Dynamic Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Nav Tabs */}
        <div className="lg:col-span-1 space-y-1">
          <Link
            href="/owner/settings?tab=org"
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold border text-left select-none transition-all ${
              activeTab === "org"
                ? "bg-indigo-50 text-indigo-700 border-indigo-100/50"
                : "bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Organization</span>
          </Link>
          
          <Link
            href="/owner/settings?tab=shops"
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold border text-left select-none transition-all ${
              activeTab === "shops"
                ? "bg-indigo-50 text-indigo-700 border-indigo-100/50"
                : "bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Shops & Access</span>
          </Link>

          <Link
            href="/owner/settings/communication-settings/email"
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold border text-left select-none transition-all bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900"
          >
            <Mail className="w-4 h-4" />
            <span>Communication</span>
          </Link>
          
          <button className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed text-left select-none opacity-60" disabled>
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>

          <button className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed text-left select-none opacity-60" disabled>
            <CreditCard className="w-4 h-4" />
            <span>Subscriptions</span>
          </button>
        </div>

        {/* Dynamic Panels */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Org details Tab panel */}
          {activeTab === "org" && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Organization Details
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Configure your store group metadata, business numbers, and brand logos.
                  </p>
                </div>

                <form className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        defaultValue={organization?.name || ""}
                        disabled
                        className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm rounded-lg outline-none cursor-not-allowed font-medium text-slate-500"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                        Web Slug / Directory Prefix
                      </label>
                      <input
                        type="text"
                        defaultValue={organization?.slug || ""}
                        disabled
                        className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm rounded-lg outline-none cursor-not-allowed font-medium text-slate-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                        HQ Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue={organization?.email || ""}
                        disabled
                        className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm rounded-lg outline-none cursor-not-allowed font-medium text-slate-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                        HQ Contact Number
                      </label>
                      <input
                        type="tel"
                        defaultValue={organization?.phone || ""}
                        disabled
                        className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm rounded-lg outline-none cursor-not-allowed font-medium text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                      HQ Address Coordinates
                    </label>
                    <textarea
                      defaultValue={organization?.address || ""}
                      disabled
                      rows={2}
                      className="w-full border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm rounded-lg outline-none cursor-not-allowed font-medium text-slate-500 resize-none"
                    />
                  </div>

                  <button 
                    type="button"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600/50 text-white font-semibold text-xs cursor-not-allowed"
                    disabled
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Organization Details</span>
                  </button>
                </form>
              </div>

              {/* Subscriptions Tab panel */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Subscription & Premium Billing
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    View your current billing plan and check trial limitations.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Active Billing tier:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-indigo-50 border-indigo-100 text-indigo-700">
                        {plan}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Your trial subscription is active and set to expire on <span className="font-semibold text-indigo-600">{formattedTrialEndsAt}</span> ({trialDaysLeft} days remaining).
                    </p>
                  </div>

                  <button 
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer shadow-md shadow-indigo-600/10 transition-all shrink-0"
                    disabled
                  >
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Shops & Access Tab panel */}
          {activeTab === "shops" && (
            <ShopManagerSettings initialShops={shopsData} />
          )}

        </div>
      </div>
    </div>
  );
}
