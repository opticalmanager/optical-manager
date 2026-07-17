"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import { PlaceholderWorkspace } from "@/components/shop/PlaceholderWorkspace";

export default function ShopSupportPage() {
  return (
    <PlaceholderWorkspace
      title="Help & Support"
      subtitle="Direct support desk, live assistance, and Optical Manager documentation."
      description="Need help with billing, inventory, or system settings? Contact Gaurav Tiwari (+91 81789 62366) or Deepak Mishra (+91 76781 06554) or email support@opticalmanager.in."
      icon={HelpCircle}
      badge="HELP DESK"
    />
  );
}
