import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fotonatrip.vercel.app";

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const redirectUri = `${appUrl}/api/mp/callback`;

  const authUrl =
    `https://auth.mercadopago.com.br/authorization` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&platform_id=mp` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${user.id}`;

  return NextResponse.redirect(authUrl);
}
