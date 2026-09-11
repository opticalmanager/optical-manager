import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrderForEdit } from "@/services/order.service";
import { canUserEditOrders, canUserDeleteOrders } from "@/utils/permissions";
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

  const canDelete = canUserDeleteOrders(user);

  let orderData = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Order edit query timeout")), 8000)
    );
    orderData = await Promise.race([
      getOrderForEdit(id, user.organizationId),
      timeoutPromise,
    ]);
  } catch {
    orderData = null;
  }

  if (!orderData) {
    redirect("/shop/orders?error=offline_order_unavailable");
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-16 space-y-6 text-slate-900">
      <EditOrderForm initialData={orderData} canDeleteOrders={canDelete} />
    </div>
  );
}
