import React from "react";
import type { Metadata } from "next";
import { getPublicPrescriptionDocumentData } from "@/services/document.service";
import { getShopBusinessDetails } from "@/lib/document-config";
import { resolveOrderPrescriptionPair } from "@/lib/prescription-helpers";
import { sanitizeDocumentFileSegment } from "@/lib/pdf-export";
import { SharedInvoiceViewer } from "@/components/shop/SharedInvoiceViewer";
import { Eye } from "lucide-react";

export const dynamic = "force-dynamic";

interface PublicPrescriptionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PublicPrescriptionPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicPrescriptionDocumentData(id);

  if (!data) {
    return {
      title: "Clinical Prescription Not Found",
    };
  }

  const shopDetails = getShopBusinessDetails(data.shop);
  const storeName = shopDetails.name || "Optical Store";
  const matchedRx = resolveOrderPrescriptionPair(data.prescriptions, data.invoice?.createdAt);
  const docNumber =
    matchedRx.metaRx?.rxNumber || data.order?.orderNumber || data.invoice?.invoiceNumber || "RX";
  const cleanStore = sanitizeDocumentFileSegment(storeName, "Optical_Store");
  const cleanDoc = sanitizeDocumentFileSegment(
    docNumber.toUpperCase().startsWith("RX") ? docNumber : `RX_${docNumber}`,
    "RX"
  );

  return {
    title: `${cleanStore}_${cleanDoc} | Clinical Eye Prescription`,
    description: `Digital optical eye prescription for ${data.customer?.fullName || "Patient"} from ${storeName}.`,
  };
}

export default async function PublicPrescriptionPage({ params }: PublicPrescriptionPageProps) {
  const { id } = await params;
  const data = await getPublicPrescriptionDocumentData(id);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Eye className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-black text-slate-900">Prescription Not Found</h1>
          <p className="text-xs font-medium text-slate-500 leading-relaxed">
            This clinical prescription link is invalid or no longer available. Please contact the optical store for an updated link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 print:bg-white py-4 sm:py-8 px-1.5 sm:px-6 print:p-0">
      <SharedInvoiceViewer data={data} mode="PRESCRIPTION" />
    </div>
  );
}
