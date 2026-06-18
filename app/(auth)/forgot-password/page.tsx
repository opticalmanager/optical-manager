"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendPasswordResetEmail } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(sendPasswordResetEmail, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Reset your password</CardTitle>
          <CardDescription>
            Enter your email address and we will send you a link to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {state?.success ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="size-16 text-success animate-scale-in" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-lg">Check your email</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  We have sent a password reset link to your email address. 
                  Please check your inbox and click the link to continue.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full font-bold gap-2">
                    <ArrowLeft className="size-4" /> Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-text-main">
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                {state?.errors?.email && (
                  <p className="text-xs text-danger font-semibold">{state.errors.email[0]}</p>
                )}
              </div>

              {state?.message && !state.success && (
                <div className="p-3 bg-danger/10 text-danger text-sm font-bold rounded border border-danger/20 text-center">
                  {state.message}
                </div>
              )}

              <Button type="submit" className="w-full font-bold shadow-sm" disabled={isPending}>
                {isPending ? "Sending link..." : "Send Reset Link"}
              </Button>

              <div className="text-center pt-2">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover hover:underline">
                  <ArrowLeft className="size-4" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
