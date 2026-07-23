"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import { signup, signInWithGoogle } from "@/actions/auth.actions";
import { 
  Glasses, 
  User,
  Building,
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Building2, 
  CheckCircle2, 
  Sparkles,
  AlertCircle,
  Loader2
} from "lucide-react";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen w-full flex bg-[#f8fafc] text-slate-900 select-none overflow-hidden font-sans">
      {/* LEFT COLUMN - Professional Brand Hero (Desktop Light Theme) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-12 flex-col justify-between overflow-hidden border-r border-slate-200/80">
        {/* Subtle Background Geometry */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
            <Glasses className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 block">
              Optical Manager
            </span>
            <span className="text-[10px] font-black tracking-widest text-[#2563eb] uppercase">
              Clinical POS & Practice Management
            </span>
          </div>
        </div>

        {/* Center Feature Presentation */}
        <div className="relative z-10 space-y-8 my-auto max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-100 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Free Organization Setup</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
              Transform your optical practice in under 2 minutes.
            </h1>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Join leading optical stores and clinical chains. Automated GST tax filings, spectacle prescription tracking, and multi-branch POS management.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Zero Setup Fee</p>
                <p className="text-[11px] text-slate-500 font-medium">Instant multi-branch POS configuration with full feature access.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Full GST Compliance</p>
                <p className="text-[11px] text-slate-500 font-medium">Automated HSN code tagging (9004 / 9001) and monthly tax ledgers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="relative z-10 flex items-center gap-6 text-xs text-slate-500 font-medium pt-4 border-t border-slate-200/70">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2563eb]" />
            <span>256-Bit Bank Grade SSL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Instant Activation</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Form & Signup (Clean SaaS Light Theme) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header Logo */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-6">
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
                Create your account
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Set up your optical organization and store branches
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
              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Dr. Arjun Mehta"
                    required
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all placeholder-slate-400"
                  />
                </div>
                {state?.errors?.fullName && (
                  <p className="text-xs text-rose-600 font-bold">{state.errors.fullName[0]}</p>
                )}
              </div>

              {/* Business Name */}
              <div className="space-y-1.5">
                <label htmlFor="organizationName" className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Business / Organization Name
                </label>
                <div className="relative flex items-center">
                  <Building className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    placeholder="VisionCare Optics"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all placeholder-slate-400"
                  />
                </div>
                {state?.errors?.organizationName && (
                  <p className="text-xs text-rose-600 font-bold">{state.errors.organizationName[0]}</p>
                )}
              </div>

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
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all placeholder-slate-400"
                  />
                </div>
                {state?.errors?.email && (
                  <p className="text-xs text-rose-600 font-bold">{state.errors.email[0]}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Password (Min. 8 characters)
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all placeholder-slate-400"
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
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Organization Account</span>
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

            {/* Bottom Login Link */}
            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Already have an account?{" "}
                <Link href="/login" className="font-extrabold text-[#2563eb] hover:underline transition-all">
                  Sign In to Account
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
