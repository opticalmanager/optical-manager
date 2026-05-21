"use client";

import React from "react";
import { LogOut, Check, Glasses } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface OnboardingShellProps {
  children: React.ReactNode;
}

export function OnboardingShell({ children }: OnboardingShellProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message || "Failed to log out");
    }
  };

  const features = [
    "Manage customers & prescriptions",
    "Track inventory in real-time",
    "Multi-shop support",
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Decorative Left Panel (40% width) - Hidden on Mobile */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-indigo-950 to-slate-950 text-white relative overflow-hidden flex-col justify-between p-12 border-r border-indigo-900/30">
        
        {/* Abstract Blurred Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] aspect-square rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] right-[10%] w-[30%] aspect-square rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />

        {/* Top Header Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-indigo-400/20">
            <Glasses className="w-6 h-6 text-white stroke-[2]" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
            Optical Manager
          </span>
        </div>

        {/* Center Tagline and Features */}
        <div className="relative my-auto space-y-10 max-w-sm">
          <div className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400/90 px-3 py-1 bg-indigo-950/80 border border-indigo-800/50 rounded-full w-fit block">
              Getting Started
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.1] text-white">
              Everything your optical store needs, <span className="text-indigo-400">in one place</span>.
            </h1>
          </div>

          <div className="space-y-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-900/40 border border-indigo-700/30 flex items-center justify-center text-indigo-400 mt-0.5 shadow-inner">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
                <p className="text-slate-200 font-medium text-sm leading-relaxed">
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Trust/Footer */}
        <div className="relative text-xs text-indigo-300/60 font-medium">
          Trusted by optical stores across India
        </div>
      </div>

      {/* Form Right Panel (60% width) - Full Width on Mobile */}
      <div className="w-full lg:w-[60%] flex flex-col justify-between p-6 sm:p-12 bg-white relative">
        
        {/* Top Header with Logout */}
        <div className="flex justify-between items-center sm:h-12 w-full">
          {/* Logo visible only on mobile/tablet */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/10">
              <Glasses className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              Optical Manager
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all font-medium text-xs ml-auto border border-transparent hover:border-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>

        {/* Form Container (Vertically centered) */}
        <div className="w-full max-w-[480px] mx-auto my-auto py-8">
          {children}
        </div>

        {/* Right Panel Footer */}
        <div className="text-center text-xs text-slate-400 w-full pt-4">
          &copy; {new Date().getFullYear()} Optical Manager. All rights reserved.
        </div>
      </div>
    </div>
  );
}
