import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

  // Fetch payout batches
  const { data: batches } = await supabase
    .from("payout_batches")
    .select("*, photographers(id, business_name, pix_key, pix_key_type)")
    .order("created_at", { ascending: false })
    .limit(100);

  // Summary stats
  const { data: pendingPayouts } = await supabase
    .from("payouts")
    .select("amount_cents")
    .eq("status", "pending");

  const totalPending = (pendingPayouts || []).reduce((s, p) => s + p.amount_cents, 0);

  const { data: paidBatches } = await supabase
    .from("payout_batches")
    .select("total_cents")
    .eq("status", "paid");

  const totalPaid = (paidBatches || []).reduce((s, b) => s + b.total_cents, 0);

  return NextResponse.json({
    batches: batches || [],
    total_pending_cents: totalPending,
    total_paid_cents: totalPaid,
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

  const body = await req.json();
  const { action, batch_id } = body as { action: string; batch_id: string };

  if (action === "mark_paid" && batch_id) {
    // Mark batch as paid
    await supabase
      .from("payout_batches")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", batch_id);

    // Mark all payouts in this batch as paid
    await supabase
      .from("payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("payout_batch_id", batch_id);

    return NextResponse.json({ success: true });
  }

  if (action === "generate_batches") {
    // Generate payout batches for pending payouts >= R$10.00
    const { data: pendingPayouts } = await supabase
      .from("payouts")
      .select("id, photographer_id, amount_cents")
      .eq("status", "pending")
      .is("payout_batch_id", null);

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
      // Minimum R$10.00
      if (group.total < 1000) continue;

      // Get photographer's Pix key
      const { data: photographer } = await supabase
        .from("photographers")
        .select("pix_key, pix_key_type")
        .eq("id", photographerId)
        .single();

      if (!photographer?.pix_key || !photographer?.pix_key_type) continue;

      // Create batch
      const { data: batch } = await supabase
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
        // Link payouts to batch
        await supabase
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
