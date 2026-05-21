import React from "react";
import Link from "next/link";
import { UserPlus, Store, PackagePlus, ArrowUpRight } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Add Customer",
      description: "Register a new customer profile and prescription card",
      href: "/owner/customers",
      icon: UserPlus,
      color: "indigo",
      colorStyles: "bg-indigo-50 text-indigo-600 border-indigo-100/50 hover:border-indigo-300 group-hover:bg-indigo-600 group-hover:text-white",
    },
    {
      title: "Configure Shop",
      description: "Manage physical branches, contact details, and locations",
      href: "/owner/shops",
      icon: Store,
      color: "emerald",
      colorStyles: "bg-emerald-50 text-emerald-600 border-emerald-100/50 hover:border-emerald-300 group-hover:bg-emerald-600 group-hover:text-white",
    },
    {
      title: "Add Inventory",
      description: "Add new frames, contact lenses, sunglasses, or solutions",
      href: "/owner/inventory",
      icon: PackagePlus,
      color: "amber",
      colorStyles: "bg-amber-50 text-amber-600 border-amber-100/50 hover:border-amber-300 group-hover:bg-amber-600 group-hover:text-white",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
        Quick System Actions
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group block bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 hover:scale-[1.01] transition-all duration-200 relative overflow-hidden"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 ${action.colorStyles}`}>
                <action.icon className="w-5 h-5 shrink-0" />
              </div>

              {/* Text */}
              <div className="space-y-1 pr-6">
                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                  {action.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {action.description}
                </p>
              </div>
            </div>

            {/* Corner arrow */}
            <div className="absolute top-4 right-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
