import React from "react";
import { getPublicReceiptDocumentData } from "@/services/document.service";
import { SharedInvoiceViewer } from "@/components/shop/SharedInvoiceViewer";
import { getShopBusinessDetails } from "@/lib/document-config";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublicReceiptDocumentData(id);

  const shopDetails = getShopBusinessDetails(data?.shop);
  const storeName = shopDetails.name || (data?.shop as any)?.organizationName || "Optical_Store";
  const docNum = data?.receipt?.receiptNumber || data?.order?.orderNumber || data?.invoice?.invoiceNumber || "Order_Form";
  const cleanStore = storeName.trim().replace(/[\/\\:*?"<>|#\s]+/g, "_").replace(/^_+|_+$/g, "");
  const cleanDoc = docNum.trim().replace(/[\/\\:*?"<>|#\s]+/g, "_").replace(/^_+|_+$/g, "");

  return {
    title: `${cleanStore}_${cleanDoc}`,
    description: `Official Optical Order Form & Booking Receipt ${docNum} from ${storeName}`,
  };
}

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublicReceiptDocumentData(id);

  if (!data) {
    notFound();
  }

  return (
    <main className="bg-slate-100 min-h-screen py-2 px-1 sm:py-6 sm:px-4 md:py-8 flex flex-col items-center print:bg-white print:p-0 font-sans text-black w-full min-w-0">
      <SharedInvoiceViewer data={data} mode="RECEIPT" />
    </main>
  );
}
