"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface ShopLayoutClientProps {
  children: React.ReactNode;
  user: any;
  shop: any;
}

export function ShopLayoutClient({ children, user, shop }: ShopLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar drawer whenever route path changes (i.e. click a link)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Desktop Sidebar (visible on desktop monitors) */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar 
          shopName={shop?.name || undefined} 
          shopAddress={shop?.address || undefined} 
        />
      </div>

      {/* Mobile Sidebar overlay drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Blur Glassmorphic Backdrop overlay */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          />

          {/* Drawer Menu Container */}
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-slate-50 border-r border-slate-200 animate-in slide-in-from-left duration-300 shadow-2xl h-full">
            <Sidebar
              shopName={shop?.name || undefined}
              shopAddress={shop?.address || undefined}
              showCloseButton
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content display column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          user={user}
          shopName={shop?.name || "Corporate Outlet"}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
