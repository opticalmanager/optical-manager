"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, Sparkles, X, Compass } from "lucide-react";
import { OPTICAL_ROUTES, predictIntendedRoute, type OpticalRouteItem } from "@/utils/optical-routes";

export function NotFoundSearchClient() {
  const [query, setQuery] = useState("");
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  const predictedRoute = useMemo(() => {
    return predictIntendedRoute(currentPath);
  }, [currentPath]);

  const filteredRoutes = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return OPTICAL_ROUTES.filter((r) => {
      return (
        r.label.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }).slice(0, 5);
  }, [query]);

  return (
    <div className="w-full max-w-md mx-auto mt-4 text-left">
      {/* "Did You Mean?" Suggested Route Alert */}
      {predictedRoute && !query && (
        <div className="mb-3 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200/70 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-4 h-4 text-[#2563eb] shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 font-medium">Looking for </span>
              <strong className="text-slate-900 font-bold">{predictedRoute.label}</strong>?
            </div>
          </div>
          <Link
            href={predictedRoute.path}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563eb] text-white text-[11px] font-bold hover:bg-blue-700 transition-colors shrink-0 shadow-2xs"
          >
            <span>Visit</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Interactive Route Finder Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search optical screens (e.g. Invoices, Patients, Inventory)..."
          className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all placeholder:text-slate-400 font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {filteredRoutes.length > 0 && (
        <div className="mt-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 text-xs">
          {filteredRoutes.map((route) => (
            <Link
              key={route.path}
              href={route.path}
              className="p-2 rounded-lg hover:bg-blue-50/70 hover:text-[#2563eb] flex items-center justify-between transition-colors group cursor-pointer"
            >
              <div className="truncate">
                <div className="font-bold text-slate-800 group-hover:text-[#2563eb] flex items-center gap-1.5">
                  <span>{route.label}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 group-hover:bg-blue-100/60 text-slate-500 font-mono">
                    {route.category}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {route.description}
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563eb] shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
