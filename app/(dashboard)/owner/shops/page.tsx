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

  return <OwnerShopsClient initialShops={dbShops} />;
}
