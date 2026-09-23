import { getCurrentUser } from "@/services/auth.service";
import { redirect } from "next/navigation";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { NewReturnForm } from "@/components/shop/NewReturnForm";

export const metadata = {
  title: "New Product Return | Optical Manager",
  description: "Process product returns, restock inventory, and issue customer refunds.",
};

export default async function NewReturnPage() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  if (!hasModulePermission(user, "returns")) {
    return (
      <AccessDenied
        moduleName="Create Product Return"
        userRole={user.customRoleName || user.role}
      />
    );
  }

  return <NewReturnForm />;
}
