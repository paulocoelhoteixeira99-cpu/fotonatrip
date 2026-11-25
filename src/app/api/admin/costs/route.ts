import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function verifyAdmin() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
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

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin)
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const supabase = getServiceClient();

    const [costsRes, monthlyRes, totalsRes] = await Promise.all([
      supabase
        .from("costs")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.rpc("admin_monthly_revenue", { p_months: 24 }),
      supabase.rpc("admin_overview_totals", { p_from: null, p_to: null }),
    ]);

    const costs = costsRes.data || [];
    const monthlyRevenue = monthlyRes.data || [];
    const totalPlatformFee = Number(
      totalsRes.data?.[0]?.platform_fee_cents || 0
    );

    // Costs aggregated by month
    const monthlyCostsMap = new Map<string, number>();
    let totalCostsCents = 0;
    for (const c of costs) {
      const month = new Date(c.created_at).toISOString().slice(0, 7);
      const amountCents = Math.round((c.amount as number) * 100);
      monthlyCostsMap.set(
        month,
        (monthlyCostsMap.get(month) || 0) + amountCents
      );
      totalCostsCents += amountCents;
    }

    // Revenue aggregated by month
    const monthlyRevenueMap = new Map<string, number>();
    for (const m of monthlyRevenue) {
      monthlyRevenueMap.set(m.month, Number(m.platform_fee_cents));
    }

    // Merge all months
    const allMonths = new Set<string>();
    for (const m of monthlyRevenueMap.keys()) allMonths.add(m);
    for (const m of monthlyCostsMap.keys()) allMonths.add(m);

    const monthly_summary = Array.from(allMonths)
      .sort()
      .map((month) => ({
        month,
        revenue_cents: monthlyRevenueMap.get(month) || 0,
        costs_cents: monthlyCostsMap.get(month) || 0,
        balance_cents:
          (monthlyRevenueMap.get(month) || 0) -
          (monthlyCostsMap.get(month) || 0),
      }));

    return NextResponse.json({
      costs: costs.map((c: any) => ({
        id: c.id,
        amount_cents: Math.round((c.amount as number) * 100),
        category: c.category,
        created_at: c.created_at,
      })),
      monthly_summary,
      totals: {
        revenue_cents: totalPlatformFee,
        costs_cents: totalCostsCents,
        balance_cents: totalPlatformFee - totalCostsCents,
      },
    });
  } catch (err) {
    console.error("Admin costs error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin)
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const { amount, category, date } = await req.json();
    if (!amount || !category) {
      return NextResponse.json(
        { error: "Valor e categoria sao obrigatorios" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const insert: Record<string, unknown> = {
      amount: parseFloat(amount),
      category,
    };
    if (date) insert.created_at = new Date(date).toISOString();

    const { error } = await supabase.from("costs").insert(insert);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin costs POST error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin)
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

    const supabase = getServiceClient();
    await supabase.from("costs").delete().eq("id", parseInt(id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin costs DELETE error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
