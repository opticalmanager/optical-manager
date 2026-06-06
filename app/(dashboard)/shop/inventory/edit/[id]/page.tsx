import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { 
  getFrameItemDetails, 
  getLensItemDetails, 
  getContactLensItemDetails, 
  getAccessoryItemDetails, 
  getInventoryItemById,
  getStockMovements
} from "@/services/inventory.service";
import { EditFrameItemForm } from "@/components/shop/EditFrameItemForm";
import { EditLensItemForm } from "@/components/shop/EditLensItemForm";
import { EditContactLensItemForm } from "@/components/shop/EditContactLensItemForm";
import { EditAccessoryItemForm } from "@/components/shop/EditAccessoryItemForm";
import { StockLedger } from "@/components/shop/StockLedger";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Edit Inventory Item | Optical Manager",
  description: "Edit metadata and restock clinical or retail inventory items.",
};

export default async function EditItemPage({ params }: PageProps) {
  const user = await getCurrentUser();
  
  if (!user || !user.shopId || !user.organizationId) {
    redirect("/login");
  }

  // Await the route path parameters
  const { id } = await params;

  // Query base inventory item first to detect category
  const baseItem = await getInventoryItemById(id, user.organizationId);

  if (!baseItem) {
    redirect("/shop/inventory");
  }

  // Fetch details and movements in parallel
  let itemDetailsPromise;
  if (baseItem.category === "LENS") {
    itemDetailsPromise = getLensItemDetails(id, user.organizationId);
  } else if (baseItem.category === "CONTACT_LENS") {
    itemDetailsPromise = getContactLensItemDetails(id, user.organizationId);
  } else if (baseItem.category === "ACCESSORY") {
    itemDetailsPromise = getAccessoryItemDetails(id, user.organizationId);
  } else {
    itemDetailsPromise = getFrameItemDetails(id, user.organizationId);
  }

  const [itemDetails, movements] = await Promise.all([
    itemDetailsPromise,
    getStockMovements(id, user.organizationId)
  ]);

  if (!itemDetails) {
    redirect("/shop/inventory");
  }

  if (baseItem.category === "LENS") {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <EditLensItemForm 
          initialData={itemDetails} 
          shopId={user.shopId} 
          itemId={id} 
        />
        <StockLedger movements={movements} inventoryItem={itemDetails} />
      </div>
    );
  }

  if (baseItem.category === "CONTACT_LENS") {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <EditContactLensItemForm 
          initialData={itemDetails} 
          shopId={user.shopId} 
          itemId={id} 
        />
        <StockLedger movements={movements} inventoryItem={itemDetails} />
      </div>
    );
  }

  if (baseItem.category === "ACCESSORY") {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <EditAccessoryItemForm 
          initialData={itemDetails} 
          shopId={user.shopId} 
          itemId={id} 
        />
        <StockLedger movements={movements} inventoryItem={itemDetails} />
      </div>
    );
  }

  // Default to Frame
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <EditFrameItemForm 
        initialData={itemDetails} 
        shopId={user.shopId} 
        itemId={id} 
      />
      <StockLedger movements={movements} inventoryItem={itemDetails} />
    </div>
  );
}

