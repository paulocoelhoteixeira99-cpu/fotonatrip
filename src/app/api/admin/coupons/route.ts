import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function verifyAdmin() {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return user;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// List all coupons
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ coupons: data });
  } catch (err) {
    console.error("List coupons error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Create coupon
export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const body = await req.json();
    const { code, discount_type, discount_value, min_order_cents, max_uses, expires_at } = body;

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json({ error: "Campos obrigatorios: code, discount_type, discount_value" }, { status: 400 });
    }

    if (!["percentage", "fixed"].includes(discount_type)) {
      return NextResponse.json({ error: "discount_type deve ser 'percentage' ou 'fixed'" }, { status: 400 });
    }

    if (discount_type === "percentage" && (discount_value < 1 || discount_value > 100)) {
      return NextResponse.json({ error: "Percentual deve ser entre 1 e 100" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: code.toUpperCase().trim(),
        discount_type,
        discount_value,
        min_order_cents: min_order_cents || null,
        max_uses: max_uses || null,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ja existe um cupom com esse codigo" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ coupon: data });
  } catch (err) {
    console.error("Create coupon error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Update coupon (toggle active, edit fields)
export async function PATCH(req: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do cupom obrigatorio" }, { status: 400 });
    }

    // Only allow specific fields to be updated
    const allowed: Record<string, unknown> = {};
    if ("active" in updates) allowed.active = updates.active;
    if ("max_uses" in updates) allowed.max_uses = updates.max_uses || null;
    if ("expires_at" in updates) allowed.expires_at = updates.expires_at || null;
    if ("min_order_cents" in updates) allowed.min_order_cents = updates.min_order_cents || null;

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("coupons")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ coupon: data });
  } catch (err) {
    console.error("Update coupon error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Delete coupon
export async function DELETE(req: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID do cupom obrigatorio" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete coupon error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
