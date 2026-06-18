"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updatePasswordAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, XCircle, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, undefined);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

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

  return (
    <Card className="w-full max-w-md shadow-lg border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Create new password</CardTitle>
        <CardDescription>
          Please enter your new password below to secure your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {state?.success ? (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="size-16 text-success animate-scale-in" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-lg">Password Updated</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Your password has been changed successfully. Redirecting you to the login screen...
              </p>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button className="w-full font-bold gap-2">
                  Go to Sign In <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-text-main">
                New Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-text-main">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Visual Password Strength Checklist */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
              <p className="text-xs font-bold text-text-main">Password Requirements:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  {checks.length ? (
                    <Check className="size-3.5 text-success shrink-0 font-bold" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-slate-300 ml-1.5 mr-1" />
                  )}
                  <span className={checks.length ? "text-success font-medium" : "text-text-muted"}>
                    At least 8 characters
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {checks.letter ? (
                    <Check className="size-3.5 text-success shrink-0 font-bold" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-slate-300 ml-1.5 mr-1" />
                  )}
                  <span className={checks.letter ? "text-success font-medium" : "text-text-muted"}>
                    At least one letter (a-z)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {checks.number ? (
                    <Check className="size-3.5 text-success shrink-0 font-bold" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-slate-300 ml-1.5 mr-1" />
                  )}
                  <span className={checks.number ? "text-success font-medium" : "text-text-muted"}>
                    At least one number (0-9)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {checks.match ? (
                    <Check className="size-3.5 text-success shrink-0 font-bold" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-slate-300 ml-1.5 mr-1" />
                  )}
                  <span className={checks.match ? "text-success font-medium" : "text-text-muted"}>
                    Passwords match
                  </span>
                </li>
              </ul>
            </div>

            {state?.message && !state.success && (
              <div className="p-3 bg-danger/10 text-danger text-sm font-bold rounded border border-danger/20 text-center">
                {state.message}
              </div>
            )}

            <Button type="submit" className="w-full font-bold shadow-sm" disabled={isPending}>
              {isPending ? "Updating password..." : "Update Password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
