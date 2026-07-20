import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/services/auth.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { getOrganizationById } from "@/services/organization.service";
import { getEmailSystemConfig } from "@/services/email.service";
import { EmailSettingsPanel } from "@/components/owner/EmailSettingsPanel";
import { Building2, Store, Mail, User, CreditCard } from "lucide-react";

export const metadata = {
  title: "Email Notifications | Communication Settings",
  description: "View automated email routing configuration for your optical stores.",
};

export default async function EmailSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Restrict access to OWNER role only
  if (user.role !== "OWNER" || !user.organizationId) {
    redirect("/shop/dashboard");
  }

  // Fetch all necessary data in parallel to keep latency minimal
  const [allShops, organization, emailConfig] = await Promise.all([
    getShopsByOrganization(user.organizationId),
    getOrganizationById(user.organizationId),
    getEmailSystemConfig(),
  ]);

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

      {/* Settings Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Nav Tabs */}
        <div className="lg:col-span-1 space-y-1">
          <Link
            href="/owner/settings?tab=org"
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold border text-left select-none transition-all bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900"
          >
            <Building2 className="w-4 h-4" />
            <span>Organization</span>
          </Link>
          
          <Link
            href="/owner/settings?tab=shops"
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold border text-left select-none transition-all bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900"
          >
            <Store className="w-4 h-4" />
            <span>Shops & Access</span>
          </Link>

          <Link
            href="/owner/settings/communication-settings/email"
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold border text-left select-none transition-all bg-indigo-50 text-indigo-700 border-indigo-100/50"
          >
            <Mail className="w-4 h-4" />
            <span>Communication</span>
          </Link>
          
          <button 
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed text-left select-none opacity-60" 
            disabled
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>

          <button 
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed text-left select-none opacity-60" 
            disabled
          >
            <CreditCard className="w-4 h-4" />
            <span>Subscriptions</span>
          </button>
        </div>

        {/* Dynamic Panels */}
        <div className="lg:col-span-3">
          <EmailSettingsPanel
            shops={allShops.map((s) => ({ id: s.id, name: s.name, email: s.email }))}
            organizationName={organization?.name || "Your Organization"}
            fromAddress={emailConfig.fromAddress}
            isConfigured={emailConfig.isConfigured}
          />
        </div>
      </div>
    </div>
  );
}
