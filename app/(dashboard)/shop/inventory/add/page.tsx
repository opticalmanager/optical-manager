import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationCategories } from "@/services/category.service";
import { AddFrameItemForm } from "@/components/shop/AddFrameItemForm";
import { AddLensItemForm } from "@/components/shop/AddLensItemForm";
import { AddContactLensItemForm } from "@/components/shop/AddContactLensItemForm";
import { AddAccessoryItemForm } from "@/components/shop/AddAccessoryItemForm";
import { AddGeneralItemForm } from "@/components/shop/AddGeneralItemForm";

export const metadata = {
  title: "Add Inventory Item | Optical Manager",
  description: "Add a new item to your retail and clinical stock catalog.",
};

interface AddItemPageProps {
  searchParams: Promise<{ category?: string }> | any;
}

export default async function AddItemPage({ searchParams }: AddItemPageProps) {
  const user = await getCurrentUser();
  
  if (!user || !user.shopId || !user.organizationId) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const rawCategory = (resolvedParams?.category || "frame").trim();
  const normalizedCategory = rawCategory.toUpperCase();

  // Load all categories configured for this organization
  const categories = await getOrganizationCategories(user.organizationId);

  // Match active category or fallback to first available
  const activeCategory =
    categories.find(
      (c) =>
        c.code.toUpperCase() === normalizedCategory ||
        c.code.toLowerCase() === rawCategory.toLowerCase()
    ) ||
    categories.find((c) => c.code === "FRAME") ||
    categories[0];

  const activeCode = activeCategory?.code || "FRAME";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {activeCode === "LENS" ? (
        <AddLensItemForm
          shopId={user.shopId}
          categoryDefaults={activeCategory}
          categories={categories}
        />
      ) : activeCode === "CONTACT_LENS" ? (
        <AddContactLensItemForm
          shopId={user.shopId}
          categoryDefaults={activeCategory}
          categories={categories}
        />
      ) : activeCode === "ACCESSORY" ? (
        <AddAccessoryItemForm
          shopId={user.shopId}
          categoryDefaults={activeCategory}
          categories={categories}
        />
      ) : activeCode === "FRAME" ? (
        <AddFrameItemForm
          shopId={user.shopId}
          categoryDefaults={activeCategory}
          categories={categories}
        />
      ) : (
        <AddGeneralItemForm
          shopId={user.shopId}
          category={activeCategory}
          categories={categories}
        />
      )}
    </div>
  );
}
