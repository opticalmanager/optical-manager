import { PatientRegistrationForm } from "@/components/shop/PatientRegistrationForm";

export const metadata = {
  title: "Add Patient | Optical Manager",
  description:
    "Onboard a new patient, record eye testing parameters, and generate check-out billing invoices.",
};

export default function NewPatientPage() {
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PatientRegistrationForm />
    </div>
  );
}
