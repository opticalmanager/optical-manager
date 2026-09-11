"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StandaloneRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    const cachedUserStr = localStorage.getItem("om_cached_user");
    const activeShopId = localStorage.getItem("om_active_shop_id");

    if (isStandalone || (cachedUserStr && activeShopId)) {
      try {
        const user = cachedUserStr ? JSON.parse(cachedUserStr) : null;
        if (user?.role === "SUPER_ADMIN") {
          router.replace("/admin");
        } else {
          router.replace("/shop/invoices/new");
        }
      } catch {
        router.replace("/shop/invoices/new");
      }
    }
  }, [router]);

  return null;
}
