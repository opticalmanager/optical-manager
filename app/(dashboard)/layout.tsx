import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    // If the database was reset/wiped in development but they have a valid Supabase session,
    // they might have an orphaned session in browser cookies. Sign them out to clear
    // the cookies and prevent infinite redirect loops.
    try {
      const supabase = await createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        console.warn(`[DashboardLayout] Orphaned session detected for user ${authUser.email}. Signing out to clear cookies...`);
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("[DashboardLayout] Failed to sign out orphaned session:", err);
    }

    redirect("/login");
  }

  if (user.role === "SUPER_ADMIN") {
    redirect("/admin");
  }

  return <>{children}</>;
}

