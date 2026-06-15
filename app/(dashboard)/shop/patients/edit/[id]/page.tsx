import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getPatientDetailsAction } from "@/actions/patient.actions";
import { PatientRegistrationForm } from "@/components/shop/PatientRegistrationForm";

interface EditPatientPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Edit Patient Details | Optical Manager",
  description: "Edit customer demographics, medical history, and clinical prescriptions.",
};

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch patient profile details (demographics + prescriptions)
  const res = await getPatientDetailsAction(id);

  if (!res.success || !res.data) {
    redirect("/shop/customers");
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PatientRegistrationForm
        initialPatientData={res.data}
        patientId={id}
      />
    </div>
  );
}
