import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Optical Manager",
  description: "Sign in to your Optical Manager account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      {children}
    </div>
  );
}
