import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import { PatientRegistrationForm } from "@/components/shop/PatientRegistrationForm";

export const metadata = {
  title: "Add Patient | Optical Manager",
  description:
    "Onboard a new patient, record eye testing parameters, and generate check-out billing invoices.",
};

export default async function NewPatientPage() {
  const user = await getCurrentUser();
  if (!hasModulePermission(user, "customers")) {
    return (
      <AccessDenied
        moduleName="Add Patient & Customer"
        userRole={user?.customRoleName || user?.role}
      />
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PatientRegistrationForm />
    </div>
  );
}
