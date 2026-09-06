import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrderForEdit } from "@/services/order.service";
import { canUserEditOrders } from "@/utils/permissions";
import { EditOrderForm } from "@/components/shop/EditOrderForm";

export const metadata = {
  title: "Edit Order | Clarity Eyecare",
  description: "Modify order line items, pricing, discounts, taxes, and payments.",
};

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !user.organizationId) {
    redirect("/login");
  }

  // Enforce role and module permission: only authorized users can view/edit
  if (!canUserEditOrders(user)) {
    redirect("/shop/orders?error=unauthorized");
  }

  const orderData = await getOrderForEdit(id, user.organizationId);

  if (!orderData) {
    notFound();
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-16 space-y-6 text-slate-900">
      <EditOrderForm initialData={orderData} />
    </div>
  );
}
