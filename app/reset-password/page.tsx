import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password — Optical Manager",
  description: "Reset your Optical Manager account password.",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  
  // Verify user has an authenticated session (which is established by the Supabase verification code)
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <XCircle className="size-12 text-danger" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Link Expired or Invalid</CardTitle>
            <CardDescription>
              This password reset link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-text-muted leading-relaxed">
              For security reasons, password reset links are only valid for a single use and expire after a short duration. 
              Please request a new link to proceed.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/forgot-password">
                <Button className="w-full font-bold">
                  Request New Link
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full font-bold gap-2">
                  <ArrowLeft className="size-4" /> Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
