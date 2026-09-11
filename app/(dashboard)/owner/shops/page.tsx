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
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Shops fetch timeout")), 8000)
    );
    const shopsRes = await Promise.race([
      getShopsWithManagers(),
      timeoutPromise,
    ]);
    if (shopsRes.success) {
      dbShops = shopsRes.data || [];
    }
  } catch (err) {
    dbShops = [];
  }

  return <OwnerShopsClient initialShops={dbShops} />;
}
