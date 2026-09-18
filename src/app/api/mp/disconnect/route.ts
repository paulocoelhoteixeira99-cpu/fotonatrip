import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { error } = await supabase
    .from("photographers")
    .update({
      mp_access_token: null,
      mp_refresh_token: null,
      mp_user_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Erro ao desconectar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
