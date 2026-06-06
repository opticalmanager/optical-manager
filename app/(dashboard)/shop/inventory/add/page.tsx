import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { AddFrameItemForm } from "@/components/shop/AddFrameItemForm";
import { AddLensItemForm } from "@/components/shop/AddLensItemForm";
import { AddContactLensItemForm } from "@/components/shop/AddContactLensItemForm";
import { AddAccessoryItemForm } from "@/components/shop/AddAccessoryItemForm";

export const metadata = {
  title: "Add Inventory Item | Optical Manager",
  description: "Add a new item to your retail and clinical stock catalog.",
};

interface AddItemPageProps {
  searchParams: Promise<{ category?: string }> | any;
}

export default async function AddItemPage({ searchParams }: AddItemPageProps) {
  const user = await getCurrentUser();
  
  if (!user || !user.shopId) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const category = resolvedParams?.category || "frame";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {category === "lens" ? (
        <AddLensItemForm shopId={user.shopId} />
      ) : category === "contact_lens" ? (
        <AddContactLensItemForm shopId={user.shopId} />
      ) : category === "accessory" ? (
        <AddAccessoryItemForm shopId={user.shopId} />
      ) : (
        <AddFrameItemForm shopId={user.shopId} />
      )}
    </div>
  );
}
