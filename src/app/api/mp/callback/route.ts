import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // photographer user id
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fotonatrip.com.br";
  const configUrl = `${appUrl}/dashboard/configuracoes`;

  if (!code || !state) {
    return NextResponse.redirect(`${configUrl}?mp=error`);
  }

  try {
    const redirectUri = `${appUrl}/api/mp/callback`;

    // Exchange authorization code for access token
    const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.MERCADOPAGO_CLIENT_ID,
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("MP OAuth token error:", tokenData);
      return NextResponse.redirect(`${configUrl}?mp=error`);
    }

    // Save tokens to photographers table (service role — no user session in callback)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("photographers")
      .update({
        mp_access_token: tokenData.access_token,
        mp_refresh_token: tokenData.refresh_token,
        mp_user_id: String(tokenData.user_id),
        updated_at: new Date().toISOString(),
      })
      .eq("id", state);

    if (error) {
      console.error("DB update error:", error);
      return NextResponse.redirect(`${configUrl}?mp=error`);
    }

    return NextResponse.redirect(`${configUrl}?mp=success`);
  } catch (err) {
    console.error("MP callback error:", err);
    return NextResponse.redirect(`${configUrl}?mp=error`);
  }
}
