"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, signInWithGoogle } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, null);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Create your account</CardTitle>
          <CardDescription>Start managing your optical store today</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-semibold text-text-main">Full Name</label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                required
                autoComplete="name"
              />
              {state?.errors?.fullName && (
                <p className="text-xs text-danger font-semibold">{state.errors.fullName[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="organizationName" className="text-sm font-semibold text-text-main">Business Name</label>
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="My Optical Store"
                required
              />
              {state?.errors?.organizationName && (
                <p className="text-xs text-danger font-semibold">{state.errors.organizationName[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-text-main">Email</label>
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

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-text-main">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
              />
              {state?.errors?.password && (
                <p className="text-xs text-danger font-semibold">{state.errors.password[0]}</p>
              )}
            </div>

            {state?.message && (
              <div className="p-3 bg-danger/10 text-danger text-sm font-bold rounded border border-danger/20 text-center">
                {state.message}
              </div>
            )}

            <Button type="submit" className="w-full font-bold shadow-sm" disabled={isPending}>
              {isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-text-muted font-bold tracking-wider">
                or continue with
              </span>
            </div>
          </div>

          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full font-bold shadow-sm">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
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
              Google
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-primary-hover hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
