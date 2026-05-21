import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { shops } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Store, MapPin, Phone, Mail, Plus, ExternalLink, Edit } from "lucide-react";
import Link from "next/link";

export default async function OwnerShopsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const dbShops = await db
    .select()
    .from(shops)
    .where(eq(shops.organizationId, user.organizationId));

  const hasRealShops = dbShops.length > 0;

  // Mock data if actual shop database is empty (to maintain premium layout visual preview)
  const displayShops = hasRealShops ? dbShops : [
    {
      id: "mock-s1",
      name: "Vision Care Bandra",
      address: "Shop No. 5, Link Road, Bandra West, Mumbai",
      phone: "+91 98765 43210",
      email: "bandra@visioncare.com",
      isActive: true,
    },
    {
      id: "mock-s2",
      name: "Optical Precision Andheri",
      address: "GF, Star Plaza, SV Road, Andheri West, Mumbai",
      phone: "+91 98123 45678",
      email: "andheri@visioncare.com",
      isActive: true,
    },
    {
      id: "mock-s3",
      name: "Colaba Eye Clinic & Optics",
      address: "12 Marine Drive, Opp. Brabourne Stadium, Colaba, Mumbai",
      phone: "+91 91234 56789",
      email: "colaba@visioncare.com",
      isActive: false,
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Shops Management
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage your physical optical retail branches, contact listings and operational statuses.
          </p>
        </div>
        
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Add New Shop</span>
        </button>
      </div>

      {!hasRealShops && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Showing Demo Outlets (Database Empty)
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayShops.map((shop) => (
          <div 
            key={shop.id} 
            className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden
              ${!shop.isActive ? "opacity-75" : ""}
            `}
          >
            {/* Upper Content */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border
                    ${shop.isActive 
                      ? "bg-indigo-50 border-indigo-100 text-indigo-600" 
                      : "bg-slate-100 border-slate-200 text-slate-500"
                    }
                  `}>
                    <Store className="w-4 h-4 shrink-0" />
                  </div>
                  <h3 className="font-bold text-slate-900 truncate max-w-[150px] leading-tight">
                    {shop.name}
                  </h3>
                </div>

                {/* Active Badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border
                  ${shop.isActive
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : "bg-slate-100 border-slate-200 text-slate-500"
                  }
                `}>
                  {shop.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Contact Listing details */}
              <div className="space-y-2 text-xs font-medium text-slate-500">
                {shop.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-normal">{shop.address}</span>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{shop.phone}</span>
                  </div>
                )}
                {shop.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{shop.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
              <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-none">
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Branch</span>
              </button>
              
              <button className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer bg-transparent border-none">
                <span>View Outlet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
