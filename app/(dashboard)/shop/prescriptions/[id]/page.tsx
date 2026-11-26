import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getPrescriptionDocumentData } from "@/services/document.service";
import { getShopBusinessDetails } from "@/lib/document-config";
import { resolveOrderPrescriptionPair } from "@/lib/prescription-helpers";
import { sanitizeDocumentFileSegment } from "@/lib/pdf-export";
import { hasModulePermission } from "@/utils/permissions";
import { DocumentActionBar } from "@/components/shop/DocumentActionBar";
import { InvoiceDocument } from "@/components/shop/InvoiceDocument";
import { ResponsiveDocumentStage } from "@/components/shop/ResponsiveDocumentStage";

export const dynamic = "force-dynamic";

interface PrescriptionDocumentPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PrescriptionDocumentPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { title: "Optical Prescription" };
  }

  const data = await getPrescriptionDocumentData(id, user.organizationId);
  if (!data) {
    return { title: "Optical Prescription" };
  }

  const shopDetails = getShopBusinessDetails(data.shop);
  const storeName = sanitizeDocumentFileSegment(shopDetails.name || "Optical_Store", "Optical_Store");
  const matchedRx = resolveOrderPrescriptionPair(data.prescriptions, data.invoice?.createdAt);
  const docNum = matchedRx.metaRx?.rxNumber || data.order?.orderNumber || data.invoice?.invoiceNumber || "RX";
  const cleanDoc = sanitizeDocumentFileSegment(
    String(docNum).toUpperCase().startsWith("RX") ? String(docNum) : `RX_${docNum}`,
    "RX"
  );

  return {
    title: `${storeName}_${cleanDoc}`,
  };
}

export default async function PrescriptionDocumentPage({ params }: PrescriptionDocumentPageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  if (!hasModulePermission(user, "sales") && !hasModulePermission(user, "customers")) {
    redirect("/shop");
  }

  const data = await getPrescriptionDocumentData(id, user.organizationId);
  if (!data) {
    notFound();
  }

  if (user.role === "SHOP_MANAGER" && user.shopId && data.invoice.shopId !== user.shopId) {
    redirect("/shop/orders");
  }

  return (
    <div className="bg-slate-100 min-h-screen py-6 px-2 sm:px-4 flex flex-col items-center gap-4 print:bg-white print:py-0 print:px-0 print:m-0 print:min-h-0 print:block font-sans text-black w-full min-w-0">
      <DocumentActionBar documentType="Prescription" data={data} />
      <ResponsiveDocumentStage dependencyKey={`PRESCRIPTION_${id}`}>
        <InvoiceDocument data={data} mode="PRESCRIPTION" />
      </ResponsiveDocumentStage>
    </div>
  );
}
