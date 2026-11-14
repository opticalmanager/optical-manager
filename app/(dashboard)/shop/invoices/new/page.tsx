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
  if (user?.role === "SUPER_ADMIN") {
    isGstAutofetchEnabled = true;
  } else {
    let orgId = user?.organizationId;
    if (!orgId && user?.shopId) {
      try {
        const { shops } = await import("@/db/schema");
        const [shop] = await db
          .select({ organizationId: shops.organizationId })
          .from(shops)
          .where(eq(shops.id, user.shopId))
          .limit(1);
        if (shop?.organizationId) {
          orgId = shop.organizationId;
        }
      } catch (err) {
        console.error("[NewInvoicePage] Error resolving shop organization:", err);
      }
    }

    if (orgId) {
      try {
        const [addon] = await db
          .select({ isEnabled: organizationAddons.isEnabled })
          .from(organizationAddons)
          .where(
            and(
              eq(organizationAddons.organizationId, orgId),
              eq(organizationAddons.addonKey, "GST_AUTOFETCH")
            )
          )
          .limit(1);
        isGstAutofetchEnabled = addon?.isEnabled || false;
      } catch (err) {
        console.error("[NewInvoicePage] Error fetching GST autofetch addon status:", err);
      }
    }
  }

  return (
    <div className="p-0">
      <NewInvoiceForm isGstAutofetchEnabled={isGstAutofetchEnabled} />
    </div>
  );
}

