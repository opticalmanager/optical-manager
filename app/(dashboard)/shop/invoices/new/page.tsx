import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { NewInvoiceForm } from "@/components/shop/NewInvoiceForm";

export const metadata = {
  title: "New Invoice | Optical Manager",
  description:
    "Load existing patients or register new ones and create a unified billing invoice checkout.",
};

export default async function NewInvoicePage() {
  const user = await getCurrentUser();
  if (!hasModulePermission(user, "sales")) {
    return (
      <AccessDenied
        moduleName="Create New Invoice"
        userRole={user?.customRoleName || user?.role}
      />
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <NewInvoiceForm />
    </div>
  );
}
