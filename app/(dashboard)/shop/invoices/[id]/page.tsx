import { getCurrentUser } from "@/services/auth.service";
import { getInvoiceDocumentData } from "@/services/document.service";
import { InvoiceDocument } from "@/components/shop/InvoiceDocument";
import { DocumentActionBar } from "@/components/shop/DocumentActionBar";
import { notFound, redirect } from "next/navigation";

export const metadata = {
  title: "Tax Invoice | Clarity Eyecare",
  description: "View and print clinical tax invoice details.",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const data = await getInvoiceDocumentData(id, user.organizationId);

  if (!data) {
    notFound();
  }

  return (
    <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center gap-8 print:bg-white print:py-0 print:px-0 font-sans text-black">
      <DocumentActionBar documentType="Invoice" data={data} />
      <InvoiceDocument data={data} mode="INVOICE" />
    </div>
  );
}
