"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { login, signInWithGoogle } from "@/actions/auth.actions";
import { 
  Glasses, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Zap, 
  AlertCircle,
  Loader2
} from "lucide-react";

// Zero-overhead dynamic loading with SSR disabled to ensure 0ms blocking time for login form
const SecureLoginAnimation = dynamic(
  () => import("@/components/auth/SecureLoginAnimation"),
  {
    ssr: false,
    loading: () => (
      <div className="w-[240px] h-[240px] rounded-2xl bg-blue-50/40 border border-blue-100/50 flex flex-col items-center justify-center animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-blue-100/70 flex items-center justify-center text-[#2563eb]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 mt-2 tracking-wide uppercase">
          Securing Gateway...
        </span>
      </div>
    ),
  }
);

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen w-full flex bg-[#f8fafc] text-slate-900 select-none overflow-hidden font-sans">
      {/* LEFT COLUMN - Professional Brand Hero with Secure Animation */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-10 xl:p-12 flex-col justify-between overflow-hidden border-r border-slate-200/80">
        {/* Subtle Background Glow Geometry */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <Glasses className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                Optical Manager
              </span>
              <span className="text-[10px] font-black tracking-widest text-[#2563eb] uppercase">
                Optical Enterprise ERP & POS
              </span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-extrabold shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Secure Cloud</span>
          </div>
        </div>

        {/* Center Presentation: Elevated Animation Card + Useful Login Context */}
        <div className="relative z-10 space-y-6 my-auto max-w-lg mx-auto w-full">
          <div className="p-7 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/90 shadow-sm flex flex-col items-center text-center space-y-5">
            {/* Lottie Animation Showcase */}
            <div className="relative flex items-center justify-center w-full">
              <SecureLoginAnimation size={240} className="mx-auto drop-shadow-xs" />
            </div>

            {/* Context Heading & Details */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-100 text-[11px] font-bold shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Protected Practice Gateway</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Unified Optical Practice Management
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                Sign in to manage patient clinical records, high-speed POS billing, multi-branch inventory, and automated GST compliance.
              </p>
            </div>

            {/* Core Capability Pills (Clean, useful, high-density) */}
            <div className="grid grid-cols-3 gap-2 w-full pt-1 border-t border-slate-100 text-left">
              <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-center">
                <span className="block text-[10px] font-extrabold uppercase text-[#2563eb] tracking-wider">Zero-Latency</span>
                <span className="text-[11px] font-bold text-slate-700 block mt-0.5">Offline POS</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-center">
                <span className="block text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">Multi-Shop</span>
                <span className="text-[11px] font-bold text-slate-700 block mt-0.5">Live Sync</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-center">
                <span className="block text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">256-Bit SSL</span>
                <span className="text-[11px] font-bold text-slate-700 block mt-0.5">Encrypted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-medium pt-4 border-t border-slate-200/70">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2563eb]" />
            <span>Role-Scoped Permissions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Hardware Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>99.99% Cloud SLA</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Form & Authentication (Clean SaaS Light Theme) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 md:p-12 bg-white min-h-screen relative">
        {/* Top Header Bar with Prominent Back to Home Button on Top Left */}
        <div className="w-full flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 text-xs font-bold text-slate-700 hover:text-[#2563eb] transition-all group shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-[#2563eb]" />
            <span>Back to Home</span>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>New to Optical Manager?</span>
            <Link href="/signup" className="text-[#2563eb] font-extrabold hover:underline">
              Create account
            </Link>
          </div>
        </div>

        {/* Form Card Container (Centered) */}
        <div className="w-full max-w-md mx-auto my-auto py-6 space-y-6">
          {/* Mobile Header Logo */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center text-white shadow-md">
              <Glasses className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Optical Manager
            </span>
          </div>

          {/* Form Card Container */}
          <div className="bg-white border border-slate-200/90 p-7 sm:p-9 rounded-2xl shadow-xl shadow-slate-100 space-y-6">
            {/* Header Title */}
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Sign in to your Optical Manager account to continue
              </p>
            </div>

            {/* Error Banner Alert */}
            {state?.message && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{state.message}</span>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
                  />
                </div>
                {state?.errors?.email && (
                  <p className="text-xs text-rose-600 font-bold">{state.errors.email[0]}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-[#2563eb] hover:text-blue-700 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {state?.errors?.password && (
                  <p className="text-xs text-rose-600 font-bold">{state.errors.password[0]}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 text-xs font-extrabold bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl cursor-pointer shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed border-none"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-3 text-slate-400 font-black tracking-widest">
                  or continue with
                </span>
              </div>
            </div>

            {/* Google OAuth Form */}
            <form action={async () => { await signInWithGoogle(); }}>
              <button
                type="submit"
                className="w-full h-11 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>

            {/* Bottom Signup Link */}
            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-extrabold text-[#2563eb] hover:underline transition-all">
                  Create an Account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Security Note */}
          <div className="text-center space-y-1">
            <p className="text-[11px] font-medium text-slate-400">
              © 2026 Optical Manager • All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
