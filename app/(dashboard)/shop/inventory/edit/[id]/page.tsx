import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getFrameItemDetails } from "@/services/inventory.service";
import { EditFrameItemForm } from "@/components/shop/EditFrameItemForm";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Edit Frame Item | Optical Manager",
  description: "Edit metadata and restock clinical or retail frame inventory items.",
};

export default async function EditItemPage({ params }: PageProps) {
  const user = await getCurrentUser();
  
  if (!user || !user.shopId || !user.organizationId) {
    redirect("/login");
  }

  // Await the route path parameters
  const { id } = await params;

  // Retrieve existing joined item details
  const item = await getFrameItemDetails(id, user.organizationId);

  if (!item) {
    redirect("/shop/inventory");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <EditFrameItemForm 
        initialData={item} 
        shopId={user.shopId} 
        itemId={id} 
      />
    </div>
  );
}
