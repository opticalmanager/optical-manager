import React from "react";
import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import SupportClient from "@/components/shop/SupportClient";

export const metadata = {
  title: "Help Center & Support | Optical Manager",
  description: "Get technical support, read setup guides, and report issues.",
};

export default async function ShopSupportPage() {
  const user = await getCurrentUser();
  if (!hasModulePermission(user, "support")) {
    return (
      <AccessDenied
        moduleName="Help Center & Support"
        userRole={user?.customRoleName || user?.role}
      />
    );
  }

  return (
    <SupportClient 
      initialName={user?.fullName || ""}
      initialEmail={user?.email || ""}
    />
  );
}
