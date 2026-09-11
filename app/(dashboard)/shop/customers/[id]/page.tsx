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

  // Retrieve customer data for profile view with fast-fail timeout for offline resilience
  let profileData: any = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Customer profile DB query timeout")), 8000)
    );
    profileData = await Promise.race([
      getCustomerProfileData(id, user.organizationId),
      timeoutPromise,
    ]);
  } catch (err) {
    console.warn("[CustomerDetailPage] Database fetch failed (offline fallback):", err);
    profileData = null;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-2 sm:py-3">
      <CustomerProfileClient initialProfile={profileData} customerId={id} />
    </div>
  );
}
