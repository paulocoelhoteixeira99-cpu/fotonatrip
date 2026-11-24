import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Verify admin
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id");
    if (!orderId) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: items } = await supabase
      .from("order_items")
      .select("photo_id, photos(original_filename)")
      .eq("order_id", orderId);

    const photos = (items || []).map((item: any) => ({
      photo_id: item.photo_id,
      filename: item.photos?.original_filename || `foto-${item.photo_id.slice(0, 8)}.jpg`,
    }));

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
