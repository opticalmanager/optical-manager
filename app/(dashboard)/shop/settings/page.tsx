import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopById } from "@/services/shop.service";
import { db } from "@/lib/drizzle";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SettingsPageClient } from "@/components/shop/SettingsPageClient";

export const metadata = {
  title: "Outlet settings | Optical Manager",
  description: "Configure store profile compliance details, bank details, tax rates, loyalty programs, and templates.",
};

interface PageProps {
  searchParams: Promise<{ view?: string }> | { view?: string };
}

export default async function ShopSettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Verify access role
  if (user.role !== "OWNER" && user.role !== "SHOP_MANAGER") {
    redirect("/login");
  }

  const shopId = user.shopId;
  if (!shopId) {
    redirect(user.role === "OWNER" ? "/owner" : "/login");
  }

  // Fetch shop metadata and staff list in parallel
  const [shop, shopStaff] = await Promise.all([
    getShopById(shopId, user.organizationId),
    db
      .select()
      .from(profiles)
      .where(eq(profiles.shopId, shopId))
      .orderBy(profiles.createdAt),
  ]);

  if (!shop) {
    redirect("/login");
  }

  // Resolve search parameters for modal drawer open state
  const resolvedParams = await (searchParams instanceof Promise ? searchParams : Promise.resolve(searchParams));
  const activeView = resolvedParams?.view ?? null;

  return (
    <SettingsPageClient 
      shop={shop} 
      staff={shopStaff} 
      activeView={activeView} 
    />
  );
}
