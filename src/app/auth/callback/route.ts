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

        if (!profile) {
          // Create profile for new OAuth user (default: client)
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "";
          await supabase.from("profiles").insert({
            id: user.id,
            full_name: fullName,
            role: "client",
          });
        }

        // Redirect based on role
        if (next) {
          return NextResponse.redirect(`${origin}${next}`);
        }
        const role = profile?.role || "client";
        const dest = role === "photographer" ? "/dashboard" : "/buscar";
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
