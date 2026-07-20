import React from "react";
import { getCurrentUser } from "@/services/auth.service";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin Control Panel | Optical Manager",
  description: "B2B SaaS Platform Control Panel for Optical Manager Super Administrators.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // If unauthenticated or non-Super Admin (e.g. on /admin/login), render full-screen standalone page without sidebar
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans flex flex-col justify-center items-center p-4">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#090d16] text-slate-100 font-sans">
      <AdminSidebar adminName={user.fullName || "Super Admin"} />
      <main className="flex-1 overflow-y-auto bg-[#090d16] p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
