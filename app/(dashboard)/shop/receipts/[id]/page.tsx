import { getCurrentUser } from "@/services/auth.service";
import { getReceiptDocumentData } from "@/services/document.service";
import { InvoiceDocument } from "@/components/shop/InvoiceDocument";
import { DocumentActionBar } from "@/components/shop/DocumentActionBar";
import { notFound, redirect } from "next/navigation";

export const metadata = {
  title: "Payment Receipt | Optical Manager",
  description: "View and print clinical payment receipt details.",
};

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getReceiptDocumentData(id, user.organizationId);

  if (!data) {
    notFound();
  }

  return (
    <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center gap-6 print:bg-white print:py-0 print:px-0 font-sans text-black">
      <DocumentActionBar documentType="Receipt" />
      <InvoiceDocument data={data} mode="RECEIPT" />
    </div>
  );
}
