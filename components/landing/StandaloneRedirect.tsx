"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function StandaloneRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // Only attempt client redirection if in installed PWA standalone mode
    if (!isStandalone) return;

    async function checkSessionAndRedirect() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        // Only redirect if there is a verified active session
        if (session?.user) {
          const role = session.user.user_metadata?.role;
          if (role === "SUPER_ADMIN") {
            router.replace("/admin");
          } else if (role === "OWNER") {
            router.replace("/owner");
          } else {
            router.replace("/shop/dashboard");
          }
        }
      } catch (err) {
        console.warn("[StandaloneRedirect] Session check error:", err);
      }
    }

    checkSessionAndRedirect();
  }, [router]);

  return null;
}

