import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Read intended role from cookie (set on signup page)
        const cookieStore = await cookies();
        const roleCookie = cookieStore.get("oauth_role")?.value;
        const intendedRole = roleCookie === "photographer" ? "photographer" : null;

        // Check if profile exists (trigger may have already created it)
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "";

        if (!profile) {
          // Trigger didn't fire yet — create profile
          const role = intendedRole || "client";
          await supabase.from("profiles").insert({
            id: user.id,
            full_name: fullName,
            role,
          });
          if (role === "photographer") {
            await supabase.from("photographers").upsert({
              id: user.id,
              display_name: fullName,
            });
          }
        } else if (intendedRole && profile.role !== intendedRole) {
          // Profile exists but role needs to change (e.g. client -> photographer)
          await supabase
            .from("profiles")
            .update({ role: intendedRole })
            .eq("id", user.id);
          if (intendedRole === "photographer") {
            await supabase.from("photographers").upsert({
              id: user.id,
              display_name: fullName,
            });
          }
        }

        // Determine redirect destination
        const isNewPhotographer = intendedRole === "photographer" && profile?.role !== "photographer";
        const isPhotographer = intendedRole === "photographer" || profile?.role === "photographer";
        let dest = next || (isPhotographer ? "/dashboard" : "/buscar");
        if (isNewPhotographer) dest = "/dashboard/configuracoes";

        const response = NextResponse.redirect(`${origin}${dest}`);
        response.cookies.set("oauth_role", "", { path: "/", maxAge: 0 });
        return response;
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
