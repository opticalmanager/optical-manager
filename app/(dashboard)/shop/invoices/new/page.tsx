import { NewInvoiceForm } from "@/components/shop/NewInvoiceForm";

export const metadata = {
  title: "New Invoice | Optical Manager",
  description:
    "Load existing patients or register new ones and create a unified billing invoice checkout.",
};

export default function NewInvoicePage() {
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <NewInvoiceForm />
    </div>
  );
}
