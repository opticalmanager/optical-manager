import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { AddFrameItemForm } from "@/components/shop/AddFrameItemForm";

export const metadata = {
  title: "Add Frame Item | Optical Manager",
  description: "Add a new frame item to your retail and clinical stock catalog.",
};

export default async function AddItemPage() {
  const user = await getCurrentUser();
  
  if (!user || !user.shopId) {
    redirect("/login");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AddFrameItemForm shopId={user.shopId} />
    </div>
  );
}
