import React from "react";
import { getPublicInvoiceDocumentData } from "@/services/document.service";
import { SharedInvoiceViewer } from "@/components/shop/SharedInvoiceViewer";
import { getShopBusinessDetails } from "@/lib/document-config";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string; type?: string; view?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const data = await getPublicInvoiceDocumentData(id);

  const isReceipt =
    search?.mode?.toUpperCase() === "RECEIPT" ||
    search?.type?.toLowerCase() === "receipt" ||
    search?.view?.toLowerCase() === "receipt";

  const shopDetails = getShopBusinessDetails(data?.shop);
  const storeName = shopDetails.name || (data?.shop as any)?.organizationName || "Optical_Store";
  const docNum = isReceipt
    ? (data?.receipt?.receiptNumber || data?.order?.orderNumber || data?.invoice?.invoiceNumber || "Order_Form")
    : (data?.invoice?.invoiceNumber || "Invoice");

  const cleanStore = storeName.trim().replace(/[\/\\:*?"<>|#\s]+/g, "_").replace(/^_+|_+$/g, "");
  const cleanDoc = docNum.trim().replace(/[\/\\:*?"<>|#\s]+/g, "_").replace(/^_+|_+$/g, "");

  return {
    title: `${cleanStore}_${cleanDoc}`,
    description: isReceipt
      ? `Official Optical Order Form & Booking Receipt ${docNum} from ${storeName}`
      : `Official Tax Invoice ${docNum} from ${storeName}`,
  };
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string; type?: string; view?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const data = await getPublicInvoiceDocumentData(id);

  if (!data) {
    notFound();
  }

  const isReceipt =
    search?.mode?.toUpperCase() === "RECEIPT" ||
    search?.type?.toLowerCase() === "receipt" ||
    search?.view?.toLowerCase() === "receipt";

  if (isReceipt && !data.receipt && data.allReceipts && data.allReceipts.length > 0) {
    data.receipt = data.allReceipts[0];
  }

  return (
    <main className="bg-slate-100 min-h-screen py-2 px-1 sm:py-6 sm:px-4 md:py-8 flex flex-col items-center print:bg-white print:p-0 font-sans text-black w-full min-w-0">
      <SharedInvoiceViewer data={data} mode={isReceipt ? "RECEIPT" : "INVOICE"} />
    </main>
  );
}
