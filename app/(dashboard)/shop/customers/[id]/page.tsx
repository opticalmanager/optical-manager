import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getCustomerProfileData } from "@/services/customer.service";
import { CustomerProfileClient } from "@/components/shop/CustomerProfileClient";

interface CustomerDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Customer Profile Details | Optical Manager",
  description: "View patient diagnostics, eye refraction prescriptions, and invoice order balance statuses.",
};

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !user.organizationId) {
    redirect("/login");
  }

  // Retrieve customer data for profile view
  const profileData = await getCustomerProfileData(id, user.organizationId);

  if (!profileData) {
    redirect("/shop/customers");
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <CustomerProfileClient profile={profileData} />
    </div>
  );
}
