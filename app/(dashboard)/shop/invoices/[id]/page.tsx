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

  if (id.startsWith("off-")) {
    redirect(`/shop/invoices/offline/${id}`);
  }

  let data = null;
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      redirect("/login");
    }
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Invoice query timeout")), 8000)
    );
    data = await Promise.race([
      getInvoiceDocumentData(id, user.organizationId),
      timeoutPromise,
    ]);
  } catch {
    // If offline or DB fails, redirect to offline viewer
    redirect(`/shop/invoices/offline/${id}`);
  }

  if (!data) {
    redirect(`/shop/invoices/offline/${id}`);
  }

  return (
    <div className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center gap-8 print:bg-white print:py-0 print:px-0 font-sans text-black">
      <DocumentActionBar documentType="Invoice" data={data} />
      <InvoiceDocument data={data} mode="INVOICE" />
    </div>
  );
}
