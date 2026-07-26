"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updatePasswordAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  KeyRound,
  Loader2,
  ShieldCheck,
  Glasses,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ResetPasswordFormProps {
  tokenHash?: string;
  isAuthSession?: boolean;
}

export default function ResetPasswordForm({ tokenHash, isAuthSession }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, undefined);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const needsManualCode = !tokenHash && !isAuthSession;

  // Redirect to login after 3 seconds on success
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  // Client-side visual validations
  const checks = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const validCount = Object.values(checks).filter(Boolean).length;
  const strengthPercentage = (validCount / 4) * 100;

  return (
    <Card className="w-full max-w-md shadow-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
      {/* Header Banner */}
      <CardHeader className="text-center pt-8 pb-4 px-6 space-y-2 relative border-b border-slate-100/80 bg-slate-50/50">
        <div className="mx-auto size-14 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white mb-1">
          {needsManualCode ? <KeyRound className="size-7" /> : <ShieldCheck className="size-7" />}
        </div>
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
          {needsManualCode ? "Reset Password" : "Create New Password"}
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
          {needsManualCode
            ? "Enter your email, the 6-digit code received, and your new password."
            : "Set a strong password to secure your Optical Manager account."}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        {state?.success ? (
          <div className="space-y-6 text-center py-4">
            <div className="flex justify-center">
              <div className="size-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-scale-in shadow-inner">
                <CheckCircle2 className="size-10 font-bold" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-xl">Password Reset Complete!</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                Your password has been updated securely. Redirecting you to the sign-in screen...
              </p>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button className="w-full h-11 text-sm font-bold gap-2 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white rounded-xl">
                  Go to Sign In <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {tokenHash && <input type="hidden" name="tokenHash" value={tokenHash} />}

            {needsManualCode && (
              <div className="space-y-3.5 bg-blue-50/40 p-3.5 rounded-xl border border-blue-100">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary" /> Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-10 text-sm bg-white border-slate-200 focus:border-primary focus:ring-primary/20 rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="otpCode" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-primary" /> 6-Digit Reset Code
                  </label>
                  <Input
                    id="otpCode"
                    name="otpCode"
                    type="text"
                    placeholder="e.g. 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    maxLength={12}
                    className="h-10 text-sm font-mono tracking-widest font-semibold bg-white border-slate-200 focus:border-primary focus:ring-primary/20 rounded-lg shadow-sm"
                  />
                  <p className="text-[11px] text-slate-500">Check your inbox for the reset code or token.</p>
                </div>
              </div>
            )}

            {/* New Password Input with Eye Icon */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="size-3.5 text-slate-500" /> New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-10 text-sm pr-10 bg-slate-50/50 border-slate-200 focus:border-primary focus:ring-primary/20 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input with Eye Icon */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="size-3.5 text-slate-500" /> Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-10 text-sm pr-10 bg-slate-50/50 border-slate-200 focus:border-primary focus:ring-primary/20 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Strength Meter Bar */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strengthPercentage <= 25
                        ? "bg-rose-500 w-1/4"
                        : strengthPercentage <= 50
                        ? "bg-amber-500 w-2/4"
                        : strengthPercentage <= 75
                        ? "bg-blue-500 w-3/4"
                        : "bg-emerald-500 w-full"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Visual Password Strength Checklist */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Requirements</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  {checks.length ? (
                    <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                  )}
                  <span className={checks.length ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                    8+ characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.letter ? (
                    <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                  )}
                  <span className={checks.letter ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                    Includes letter
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.number ? (
                    <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                  )}
                  <span className={checks.number ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                    Includes number
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.match ? (
                    <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                  )}
                  <span className={checks.match ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                    Passwords match
                  </span>
                </div>
              </div>
            </div>

            {state?.message && !state.success && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 text-center animate-fade-in">
                {state.message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Updating password...
                </span>
              ) : (
                "Update Password"
              )}
            </Button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
              >
                <ArrowLeft className="size-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
