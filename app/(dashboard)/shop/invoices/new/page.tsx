import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { NewInvoiceForm } from "@/components/shop/NewInvoiceForm";
import { db } from "@/lib/drizzle";
import { organizationAddons } from "@/db/schema/addons";
import { eq, and } from "drizzle-orm";

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

  let isGstAutofetchEnabled = false;
  if (user?.organizationId) {
    try {
      const [addon] = await db
        .select({ isEnabled: organizationAddons.isEnabled })
        .from(organizationAddons)
        .where(
          and(
            eq(organizationAddons.organizationId, user.organizationId),
            eq(organizationAddons.addonKey, "GST_AUTOFETCH")
          )
        )
        .limit(1);
      isGstAutofetchEnabled = addon?.isEnabled || false;
    } catch (err) {
      console.error("[NewInvoicePage] Error fetching GST autofetch addon status:", err);
    }
  }

  return (
    <div className="p-0">
      <NewInvoiceForm isGstAutofetchEnabled={isGstAutofetchEnabled} />
    </div>
  );
}

