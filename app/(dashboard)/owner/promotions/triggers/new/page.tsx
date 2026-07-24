import React from "react";
import { CreateTriggerClient } from "@/components/owner/promotions/CreateTriggerClient";

export const metadata = {
  title: "Create New Trigger | Optical Manager",
  description: "Set up automated WhatsApp message triggers for birthdays, purchases, and appointments.",
};

export default function CreateTriggerPage() {
  return <CreateTriggerClient />;
}
