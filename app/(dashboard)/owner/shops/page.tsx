import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopsWithManagers } from "@/services/shop-manager.service";
import { OwnerShopsClient } from "@/components/owner/OwnerShopsClient";

export default async function OwnerShopsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let dbShops: any[] = [];
  const shopsRes = await getShopsWithManagers();
  if (shopsRes.success) {
    dbShops = shopsRes.data || [];
  }

  const hasRealShops = dbShops.length > 0;

  // Fallback demo data if database shops list is empty
  const displayShops = hasRealShops
    ? dbShops
    : [
        {
          id: "mock-s1",
          name: "dhaba opticals",
          address: "Main Road, Central Market",
          phone: "+91 98765 43210",
          email: "testuser12@gmail.com",
          isActive: true,
          manager: {
            id: "mock-m1",
            email: "testuser12@gmail.com",
            fullName: "dhaba opticals Manager",
            isActive: true,
          },
        },
      ];

  return <OwnerShopsClient initialShops={displayShops} />;
}
