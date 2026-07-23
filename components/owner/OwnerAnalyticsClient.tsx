"use client";

import React from "react";
import AnalyticsClient from "@/components/shop/AnalyticsClient";
import { OutletFilterSelector, ShopOption } from "./OutletFilterSelector";
import { DashboardData } from "@/services/dashboard.service";

interface OwnerAnalyticsClientProps {
  data: DashboardData;
  shops: ShopOption[];
  currentShopId: string;
  currentTimeframe: string;
  currentCompareMode?: string;
  currentGranularity?: string;
  currentPeriodA?: string;
  currentPeriodB?: string;
}

export function OwnerAnalyticsClient({
  data,
  shops,
  currentShopId,
  currentTimeframe,
  currentCompareMode,
  currentGranularity,
  currentPeriodA,
  currentPeriodB,
}: OwnerAnalyticsClientProps) {
  return (
    <div className="space-y-6">
      {/* Top Outlet Filter Dropdown Toolbar */}
      <OutletFilterSelector
        shops={shops}
        currentShopId={currentShopId}
        totalBranchCount={shops.length}
      />

      {/* Embedded High-Density Analytics View */}
      <AnalyticsClient
        data={data}
        currentTimeframe={currentTimeframe}
        currentCompareMode={currentCompareMode}
        currentGranularity={currentGranularity}
        currentPeriodA={currentPeriodA}
        currentPeriodB={currentPeriodB}
      />
    </div>
  );
}
