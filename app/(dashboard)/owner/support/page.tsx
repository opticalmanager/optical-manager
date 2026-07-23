import React from "react";
import { getCurrentUser } from "@/services/auth.service";
import SupportClient from "@/components/shop/SupportClient";

export const metadata = {
  title: "Help Center & Support | Optical Manager",
  description: "Get technical support, read setup guides, and report issues.",
};

export default async function OwnerSupportPage() {
  const user = await getCurrentUser();

  return (
    <SupportClient 
      initialName={user?.fullName || ""}
      initialEmail={user?.email || ""}
    />
  );
}
