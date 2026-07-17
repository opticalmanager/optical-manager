"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { PlaceholderWorkspace } from "@/components/shop/PlaceholderWorkspace";

export default function ShopReportsPage() {
  return (
    <PlaceholderWorkspace
      title="Store Reports"
      subtitle="Export GSTR-1 GST tax filings, daily sales ledgers, and inventory valuation reports."
      description="The store report export system will allow store managers to download monthly tax ledgers, patient logs, and inventory CSV spreadsheets."
      icon={TrendingUp}
    />
  );
}
