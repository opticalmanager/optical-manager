import React from "react";
import AdminLoginClient from "@/components/admin/AdminLoginClient";

export const metadata = {
  title: "Super Admin Authentication | Optical Manager Control Panel",
  description: "Restricted platform control panel login for Optical Manager Super Administrators.",
};

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
