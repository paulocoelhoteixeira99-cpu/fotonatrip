import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Verify auth via session cookie
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Parse date filters
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    // Fetch all paid orders
    let ordersQuery = supabase
      .from("orders")
      .select("id, client_email, total_cents, platform_fee_cents, status, created_at, photographer_id")
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    if (from) ordersQuery = ordersQuery.gte("created_at", `${from}T00:00:00`);
    if (to) ordersQuery = ordersQuery.lte("created_at", `${to}T23:59:59`);

    const { data: orders } = await ordersQuery;

    // Fetch order_items with photographer info for breakdown
    let itemsQuery = supabase
      .from("order_items")
      .select(`
        id, price_cents, photographer_id, order_id, created_at,
        orders!inner(status, created_at)
      `)
      .eq("orders.status", "paid");

    if (from) itemsQuery = itemsQuery.gte("orders.created_at", `${from}T00:00:00`);
    if (to) itemsQuery = itemsQuery.lte("orders.created_at", `${to}T23:59:59`);

    const { data: items } = await itemsQuery;

    // Fetch photographer names
    const { data: photographers } = await supabase
      .from("photographers")
      .select("id, business_name, profiles(full_name)");

    // Build photographer name map
    const photographerMap = new Map<string, string>();
    for (const p of photographers || []) {
      const profile = p.profiles as unknown as { full_name: string } | null;
      photographerMap.set(p.id, p.business_name || profile?.full_name || "Sem nome");
    }

    // Aggregate totals
    const totalRevenue = (orders || []).reduce((sum, o) => sum + o.total_cents, 0);
    const totalPlatformFee = (orders || []).reduce((sum, o) => sum + (o.platform_fee_cents || 0), 0);
    const totalPhotographerPayout = totalRevenue - totalPlatformFee;

    // Breakdown by photographer
    const byPhotographer = new Map<string, { revenue: number; items: number }>();
    for (const item of items || []) {
      if (!item.photographer_id) continue;
      const current = byPhotographer.get(item.photographer_id) || { revenue: 0, items: 0 };
      current.revenue += item.price_cents;
      current.items += 1;
      byPhotographer.set(item.photographer_id, current);
    }

    const photographerBreakdown = Array.from(byPhotographer.entries())
      .map(([id, data]) => ({
        id,
        name: photographerMap.get(id) || "Sem nome",
        revenue_cents: data.revenue,
        platform_fee_cents: Math.round(data.revenue * 0.07),
        payout_cents: Math.round(data.revenue * 0.93),
        items_sold: data.items,
      }))
      .sort((a, b) => b.revenue_cents - a.revenue_cents);

    // Recent orders (last 20)
    const recentOrders = (orders || []).slice(0, 20).map((o) => ({
      id: o.id,
      client_email: o.client_email,
      total_cents: o.total_cents,
      platform_fee_cents: o.platform_fee_cents || 0,
      photographer_name: o.photographer_id ? photographerMap.get(o.photographer_id) || "Sem nome" : "—",
      created_at: o.created_at,
    }));

    // General stats
    const { count: totalEvents } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true });

    const { count: totalPhotos } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready");

    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    return NextResponse.json({
      totals: {
        revenue_cents: totalRevenue,
        platform_fee_cents: totalPlatformFee,
        photographer_payout_cents: totalPhotographerPayout,
        orders_count: (orders || []).length,
        events_count: totalEvents || 0,
        photos_count: totalPhotos || 0,
        users_count: totalUsers || 0,
      },
      photographer_breakdown: photographerBreakdown,
      recent_orders: recentOrders,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
