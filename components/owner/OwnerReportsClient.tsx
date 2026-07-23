"use client";

import React from "react";
import ReportsClient from "@/components/shop/ReportsClient";
import { OutletFilterSelector, ShopOption } from "./OutletFilterSelector";
import { 
  SalesSummaryReportData, 
  ItemWiseReportData, 
  GSTReportData, 
  InventoryReportData, 
  PaymentCollectionReportData, 
  AppointmentReportData,
  DayWiseCollectionReportData,
  OutstandingDuesReportData,
  DeadStockReportData
} from "@/services/report.service";

interface OwnerReportsClientProps {
  shopId: string;
  shops: ShopOption[];
  salesData: SalesSummaryReportData;
  itemData: ItemWiseReportData;
  gstData: GSTReportData;
  inventoryData: InventoryReportData;
  paymentData: PaymentCollectionReportData;
  appointmentData: AppointmentReportData;
  dayWiseData: DayWiseCollectionReportData;
  duesData: OutstandingDuesReportData;
  deadStockData: DeadStockReportData;
  autoReportSchedule?: { type: "daily" | "weekly" | "off"; email?: string };
  initialFrom?: string;
  initialTo?: string;
}

export function OwnerReportsClient({
  shopId,
  shops,
  salesData,
  itemData,
  gstData,
  inventoryData,
  paymentData,
  appointmentData,
  dayWiseData,
  duesData,
  deadStockData,
  autoReportSchedule,
  initialFrom,
  initialTo,
}: OwnerReportsClientProps) {
  return (
    <div className="space-y-6">
      {/* Top Outlet Context Selector */}
      <OutletFilterSelector
        shops={shops}
        currentShopId={shopId}
        totalBranchCount={shops.length}
      />

      {/* Reports Interface */}
      <ReportsClient
        shopId={shopId}
        salesData={salesData}
        itemData={itemData}
        gstData={gstData}
        inventoryData={inventoryData}
        paymentData={paymentData}
        appointmentData={appointmentData}
        dayWiseData={dayWiseData}
        duesData={duesData}
        deadStockData={deadStockData}
        autoReportSchedule={autoReportSchedule}
        initialFrom={initialFrom}
        initialTo={initialTo}
      />
    </div>
  );
}
