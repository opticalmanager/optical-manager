import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";
import Link from "next/link";
import { Glasses } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password — Optical Manager",
  description: "Reset your Optical Manager account password.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/80 via-slate-50 to-slate-100/90 overflow-hidden">
      {/* Background Decorative Blur Spheres */}
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <Glasses className="size-6" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Optical <span className="text-primary">Manager</span>
          </span>
        </Link>
      </div>

      {/* Main Form Card Wrapper */}
      <div className="w-full max-w-md z-10 animate-fade-in">
        <ResetPasswordForm tokenHash={token} isAuthSession={!!user} />
      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-xs text-slate-400 font-medium z-10">
        © {new Date().getFullYear()} Optical Manager. All rights reserved.
      </div>
    </div>
  );
}
