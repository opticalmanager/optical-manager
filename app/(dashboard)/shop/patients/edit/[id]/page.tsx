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

  // Fetch patient profile details (demographics + prescriptions) with fast timeout race
  let initialData: any = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Patient details DB query timeout")), 8000)
    );
    const res: any = await Promise.race([
      getPatientDetailsAction(id),
      timeoutPromise,
    ]);
    if (res?.success && res?.data) {
      initialData = res.data;
    }
  } catch (err) {
    console.warn("[EditPatientPage] Database fetch failed (offline fallback):", err);
    initialData = null;
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PatientRegistrationForm
        initialPatientData={initialData}
        patientId={id}
      />
    </div>
  );
}
