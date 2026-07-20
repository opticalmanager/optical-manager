"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unauthorizedError = searchParams.get("error") === "unauthorized";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      const role = data.user?.user_metadata?.role;
      if (role !== "SUPER_ADMIN") {
        await supabase.auth.signOut();
        setErrorMessage("Access Restricted: Your account does not have Super Admin permissions.");
        setIsLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected authentication error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto space-y-6 select-none animate-in fade-in duration-300">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
          <Shield className="h-3.5 w-3.5" />
          <span>Platform Control Panel</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Optical Manager
        </h1>
        <p className="text-xs text-slate-400 font-normal">
          Enter Super Admin credentials to access tenant analytics and system controls.
        </p>
      </div>

      {/* Alert Notices */}
      {unauthorizedError && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs font-medium text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>Session expired or unauthorized. Please sign in with Super Admin credentials.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs font-medium text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-[#0d1424] border border-slate-800/80 p-6 sm:p-7 rounded-2xl shadow-2xl space-y-5">
        <form onSubmit={handleAdminLogin} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">
              Admin Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gauravtiwari8178@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-2 transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed border-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Control Panel</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Minimal Security Disclaimer */}
      <div className="text-center">
        <p className="text-[11px] font-medium text-slate-500">
          © 2026 Optical Manager • Platform Administration
        </p>
      </div>
    </div>
  );
}
