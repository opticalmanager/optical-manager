import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "Sign In — Optical Manager",
  description: "Sign in to your Optical Manager account.",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user) {
    if (user.role === "SHOP_MANAGER") {
      redirect("/shop/dashboard");
    } else {
      redirect("/owner");
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {children}
    </div>
  );
}
