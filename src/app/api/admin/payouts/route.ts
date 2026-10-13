import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createClient();

  // Check auth + admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const supa = getServiceSupabase();

  // Fetch payout batches
  const { data: batches } = await supa
    .from("payout_batches")
    .select("*, photographers(id, business_name, pix_key, pix_key_type)")
    .order("created_at", { ascending: false })
    .limit(100);

  // Summary stats — only count payouts from PAID orders
  const { data: pendingPayouts } = await supa
    .from("payouts")
    .select("amount_cents, photographer_id, type, order_items!inner(orders!inner(status))")
    .eq("status", "pending")
    .eq("order_items.orders.status", "paid");

  const validPending = (pendingPayouts || []) as { amount_cents: number; photographer_id: string; type: string }[];
  const totalPending = validPending.reduce((s, p) => s + p.amount_cents, 0);

  // Breakdown by photographer (descending by amount), with type split
  const byPhotographer = new Map<string, { total: number; own_photos: number; commission: number; collaborator: number; count: number }>();
  for (const p of validPending) {
    if (!byPhotographer.has(p.photographer_id)) {
      byPhotographer.set(p.photographer_id, { total: 0, own_photos: 0, commission: 0, collaborator: 0, count: 0 });
    }
    const group = byPhotographer.get(p.photographer_id)!;
    group.total += p.amount_cents;
    group.count++;
    if (p.type === "host_own_photos") group.own_photos += p.amount_cents;
    else if (p.type === "host_commission") group.commission += p.amount_cents;
    else if (p.type === "collaborator_payout") group.collaborator += p.amount_cents;
  }

  const photographerIds = [...byPhotographer.keys()];
  const { data: photographerRows } = photographerIds.length > 0
    ? await supa
        .from("photographers")
        .select("id, business_name, pix_key, pix_key_type")
        .in("id", photographerIds)
    : { data: [] };

  const photographerMap = new Map((photographerRows || []).map((p: any) => [p.id, p]));

  const pending_breakdown = [...byPhotographer.entries()]
    .map(([id, group]) => {
      const ph = photographerMap.get(id);
      return {
        photographer_id: id,
        business_name: ph?.business_name || "Fotografo",
        pix_key: ph?.pix_key || null,
        pix_key_type: ph?.pix_key_type || null,
        amount_cents: group.total,
        own_photos_cents: group.own_photos,
        commission_cents: group.commission,
        collaborator_cents: group.collaborator,
        items_count: group.count,
      };
    })
    .sort((a, b) => b.amount_cents - a.amount_cents);

  const { data: paidBatches } = await supa
    .from("payout_batches")
    .select("total_cents")
    .eq("status", "paid");

  const totalPaid = (paidBatches || []).reduce((s, b) => s + b.total_cents, 0);

  return NextResponse.json({
    batches: batches || [],
    total_pending_cents: totalPending,
    total_paid_cents: totalPaid,
    pending_breakdown,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Check auth + admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const supa = getServiceSupabase();
  const body = await req.json();
  const { action, batch_id } = body as { action: string; batch_id: string };

  if (action === "mark_paid" && batch_id) {
    await supa
      .from("payout_batches")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", batch_id);

    await supa
      .from("payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("payout_batch_id", batch_id);

    return NextResponse.json({ success: true });
  }

  if (action === "generate_batches") {
    // Only batch payouts from PAID orders
    const { data: pendingPayouts } = await supa
      .from("payouts")
      .select("id, photographer_id, amount_cents, order_items!inner(orders!inner(status))")
      .eq("status", "pending")
      .is("payout_batch_id", null)
      .eq("order_items.orders.status", "paid");

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return NextResponse.json({ message: "Nenhum payout pendente", batches_created: 0 });
    }

    // Group by photographer
    const byPhotographer = new Map<string, { ids: string[]; total: number }>();
    for (const p of pendingPayouts) {
      if (!byPhotographer.has(p.photographer_id)) {
        byPhotographer.set(p.photographer_id, { ids: [], total: 0 });
      }
      const group = byPhotographer.get(p.photographer_id)!;
      group.ids.push(p.id);
      group.total += p.amount_cents;
    }

    let batchesCreated = 0;

    for (const [photographerId, group] of byPhotographer) {
      if (group.total < 100) continue; // Mínimo R$1,00

      const { data: photographer } = await supa
        .from("photographers")
        .select("pix_key, pix_key_type")
        .eq("id", photographerId)
        .single();

      if (!photographer?.pix_key || !photographer?.pix_key_type) continue;

      const { data: batch } = await supa
        .from("payout_batches")
        .insert({
          photographer_id: photographerId,
          total_cents: group.total,
          items_count: group.ids.length,
          pix_key: photographer.pix_key,
          pix_key_type: photographer.pix_key_type,
        })
        .select("id")
        .single();

      if (batch) {
        await supa
          .from("payouts")
          .update({ payout_batch_id: batch.id })
          .in("id", group.ids);

        batchesCreated++;
      }
    }

    return NextResponse.json({ success: true, batches_created: batchesCreated });
  }

  return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
}
