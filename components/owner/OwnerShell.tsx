"use client";

import React, { useState } from "react";
import { OwnerSidebar } from "./OwnerSidebar";
import { OwnerHeader } from "./OwnerHeader";
import { X } from "lucide-react";

interface OwnerShellProps {
  children: React.ReactNode;
  organizationName: string;
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  hasLowStockAlerts?: boolean;
}

export function OwnerShell({ 
  children, 
  organizationName, 
  user, 
  hasLowStockAlerts = false 
}: OwnerShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      
      {/* 1. Desktop Sidebar (Left Panel) - Hidden on Mobile */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0">
        <OwnerSidebar user={user} />
      </div>

      {/* 2. Mobile Sidebar Drawer Overlay (lg hidden) */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          {/* Translucent Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Drawer Sidebar Container */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-slate-200 animate-slide-in-left shadow-2xl z-50">
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar content */}
            <OwnerSidebar user={user} onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* 3. Right Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Header */}
        <OwnerHeader
          organizationName={organizationName}
          user={user}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          hasLowStockAlerts={hasLowStockAlerts}
        />

        {/* Dynamic Main Workspace Panel */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
