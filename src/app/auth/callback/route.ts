import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
        // Check if profile exists (new OAuth user won't have one)
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const roleParam = searchParams.get("role");
        const validRole = roleParam === "photographer" ? "photographer" : "client";

        if (!profile) {
          // Create profile for new OAuth user
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "";
          await supabase.from("profiles").insert({
            id: user.id,
            full_name: fullName,
            role: validRole,
          });

          // Also create photographer record if needed
          if (validRole === "photographer") {
            await supabase.from("photographers").insert({
              id: user.id,
              display_name: fullName,
            });
          }
        }

        // Redirect based on role
        if (next) {
          return NextResponse.redirect(`${origin}${next}`);
        }
        const finalRole = profile?.role || validRole;
        const dest = finalRole === "photographer" ? "/dashboard" : "/buscar";
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
