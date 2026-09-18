import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (
        c.name.startsWith("sb-") ||
        c.name.includes("auth-token") ||
        c.name.includes("session") ||
        c.name === "opt_session_profile" ||
        c.name === "active_shop_context_id"
      ) {
        response.cookies.set(c.name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
        });
      }
    }
  } catch {}

  return response;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}

  const url = new URL("/", request.url);
  const response = NextResponse.redirect(url);

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (
        c.name.startsWith("sb-") ||
        c.name.includes("auth-token") ||
        c.name.includes("session") ||
        c.name === "opt_session_profile" ||
        c.name === "active_shop_context_id"
      ) {
        response.cookies.set(c.name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
        });
      }
    }
  } catch {}

  return response;
}
