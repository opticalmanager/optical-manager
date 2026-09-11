import React from "react";
import { OfflineInvoiceView } from "@/components/shop/OfflineInvoiceView";

export const metadata = {
  title: "Offline Invoice | Optical Manager",
  description: "View and print offline invoice saved in local device memory.",
};

export default async function OfflineInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OfflineInvoiceView queueId={id} />;
}
