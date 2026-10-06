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

function parseDateFilters(url: URL) {
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}

// ─── Overview ───────────────────────────────────────────────

async function getOverview(from: string | null, to: string | null) {
  const supabase = getServiceClient();

  // Paid orders
  let ordersQuery = supabase
    .from("orders")
    .select("id, client_email, total_cents, platform_fee_cents, status, created_at, photographer_id")
    .eq("status", "paid")
    .order("created_at", { ascending: false });
  if (from) ordersQuery = ordersQuery.gte("created_at", `${from}T00:00:00`);
  if (to) ordersQuery = ordersQuery.lte("created_at", `${to}T23:59:59`);
  const { data: orders } = await ordersQuery;

  // Order items for photographer breakdown
  let itemsQuery = supabase
    .from("order_items")
    .select("id, price_cents, photographer_id, order_id, created_at, orders!inner(status, created_at)")
    .eq("orders.status", "paid");
  if (from) itemsQuery = itemsQuery.gte("orders.created_at", `${from}T00:00:00`);
  if (to) itemsQuery = itemsQuery.lte("orders.created_at", `${to}T23:59:59`);
  const { data: items } = await itemsQuery;

  // Photographer names
  const { data: photographers } = await supabase
    .from("photographers")
    .select("id, business_name, profiles(full_name)");

  const photographerMap = new Map<string, string>();
  for (const p of photographers || []) {
    const profile = p.profiles as unknown as { full_name: string } | null;
    photographerMap.set(p.id, p.business_name || profile?.full_name || "Sem nome");
  }

  // Totals
  const totalRevenue = (orders || []).reduce((sum, o) => sum + o.total_cents, 0);
  const totalPlatformFee = (orders || []).reduce((sum, o) => sum + (o.platform_fee_cents || 0), 0);

  // Photographer breakdown
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

  // Recent orders
  const recentOrders = (orders || []).slice(0, 20).map((o) => ({
    id: o.id,
    client_email: o.client_email,
    total_cents: o.total_cents,
    platform_fee_cents: o.platform_fee_cents || 0,
    photographer_name: o.photographer_id ? photographerMap.get(o.photographer_id) || "Sem nome" : "—",
    created_at: o.created_at,
  }));

  // Counts
  const { count: totalEvents } = await supabase.from("events").select("id", { count: "exact", head: true });
  const { count: totalPhotos } = await supabase.from("photos").select("id", { count: "exact", head: true }).eq("status", "ready");
  const { count: totalUsers } = await supabase.from("profiles").select("id", { count: "exact", head: true });
  const { count: totalPhotographers } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "photographer");
  const { count: totalClients } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client");

  // Ticket medio
  const ordersCount = (orders || []).length;
  const avgTicketCents = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

  return {
    totals: {
      revenue_cents: totalRevenue,
      platform_fee_cents: totalPlatformFee,
      photographer_payout_cents: totalRevenue - totalPlatformFee,
      orders_count: ordersCount,
      events_count: totalEvents || 0,
      photos_count: totalPhotos || 0,
      users_count: totalUsers || 0,
      photographers_count: totalPhotographers || 0,
      clients_count: totalClients || 0,
      avg_ticket_cents: avgTicketCents,
    },
    photographer_breakdown: photographerBreakdown,
    recent_orders: recentOrders,
  };
}

// ─── Sales by Event ─────────────────────────────────────────

async function getSalesByEvent(from: string | null, to: string | null) {
  const supabase = getServiceClient();

  // All events with photographer info
  const { data: events } = await supabase
    .from("events")
    .select("id, title, photo_count, photographer_id, price_per_photo_cents, status");

  // Photographer names
  const { data: photographers } = await supabase
    .from("photographers")
    .select("id, business_name, profiles(full_name)");

  const photographerMap = new Map<string, string>();
  for (const p of photographers || []) {
    const profile = p.profiles as unknown as { full_name: string } | null;
    photographerMap.set(p.id, p.business_name || profile?.full_name || "Sem nome");
  }

  // Get all paid order items with photo event info
  let itemsQuery = supabase
    .from("order_items")
    .select("id, price_cents, photo_id, order_id, orders!inner(status, created_at), photos!inner(event_id)")
    .eq("orders.status", "paid");
  if (from) itemsQuery = itemsQuery.gte("orders.created_at", `${from}T00:00:00`);
  if (to) itemsQuery = itemsQuery.lte("orders.created_at", `${to}T23:59:59`);
  const { data: items } = await itemsQuery;

  // Aggregate by event
  const byEvent = new Map<string, { items_sold: number; revenue_cents: number; unique_orders: Set<string> }>();
  for (const item of items || []) {
    const photo = item.photos as unknown as { event_id: string } | null;
    if (!photo?.event_id) continue;
    const eventId = photo.event_id;
    const current = byEvent.get(eventId) || { items_sold: 0, revenue_cents: 0, unique_orders: new Set<string>() };
    current.items_sold += 1;
    current.revenue_cents += item.price_cents;
    current.unique_orders.add(item.order_id);
    byEvent.set(eventId, current);
  }

  // Build response
  const eventSales = (events || []).map((e) => {
    const sales = byEvent.get(e.id);
    return {
      id: e.id,
      title: e.title,
      photographer: photographerMap.get(e.photographer_id) || "Sem nome",
      photo_count: e.photo_count || 0,
      price_cents: e.price_per_photo_cents || 0,
      status: e.status,
      items_sold: sales?.items_sold || 0,
      orders_count: sales?.unique_orders.size || 0,
      revenue_cents: sales?.revenue_cents || 0,
      platform_fee_cents: Math.round((sales?.revenue_cents || 0) * 0.07),
    };
  }).sort((a, b) => b.revenue_cents - a.revenue_cents);

  return { event_sales: eventSales };
}

// ─── Growth ─────────────────────────────────────────────────

async function getGrowth() {
  const supabase = getServiceClient();

  // All profiles with created_at and role
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .order("created_at", { ascending: true });

  // Daily registration data (last 90 days)
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const dailyGrowth: { date: string; clients: number; photographers: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyGrowth.push({ date: dateStr, clients: 0, photographers: 0 });
  }

  const dateMap = new Map(dailyGrowth.map((d, i) => [d.date, i]));

  for (const p of profiles || []) {
    const dateStr = new Date(p.created_at).toISOString().split("T")[0];
    const idx = dateMap.get(dateStr);
    if (idx === undefined) continue;
    if (p.role === "client") dailyGrowth[idx].clients += 1;
    else if (p.role === "photographer") dailyGrowth[idx].photographers += 1;
  }

  // Cumulative totals
  let cumClients = 0;
  let cumPhotographers = 0;
  // Count users before the 90-day window
  for (const p of profiles || []) {
    const dateStr = new Date(p.created_at).toISOString().split("T")[0];
    if (dateStr < dailyGrowth[0].date) {
      if (p.role === "client") cumClients++;
      else if (p.role === "photographer") cumPhotographers++;
    }
  }

  const cumulativeGrowth = dailyGrowth.map((d) => {
    cumClients += d.clients;
    cumPhotographers += d.photographers;
    return { date: d.date, total_clients: cumClients, total_photographers: cumPhotographers };
  });

  return { daily_growth: dailyGrowth, cumulative_growth: cumulativeGrowth };
}

// ─── Traffic ────────────────────────────────────────────────

function parseUserAgent(ua: string): { browser: string; device: string; os: string } {
  let browser = "Outro";
  let device = "Desktop";
  let os = "Outro";

  // Browser
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox\//i.test(ua)) browser = "Firefox";

  // OS
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  // Device
  if (/mobile|android|iphone|ipod/i.test(ua)) device = "Mobile";
  else if (/ipad|tablet/i.test(ua)) device = "Tablet";

  return { browser, device, os };
}

async function getTraffic(from: string | null, to: string | null) {
  const supabase = getServiceClient();

  // Get page views
  let viewsQuery = supabase
    .from("page_views")
    .select("id, path, event_id, user_agent, referrer, session_id, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (from) viewsQuery = viewsQuery.gte("created_at", `${from}T00:00:00`);
  if (to) viewsQuery = viewsQuery.lte("created_at", `${to}T23:59:59`);
  const { data: views } = await viewsQuery;

  if (!views || views.length === 0) {
    return {
      daily_views: [],
      top_pages: [],
      user_agents: [],
      devices: [],
      browsers: [],
      referrers: [],
      event_conversion: [],
      totals: { views: 0, sessions: 0 },
    };
  }

  // Daily views
  const dailyMap = new Map<string, { views: number; sessions: Set<string> }>();
  for (const v of views) {
    const dateStr = new Date(v.created_at).toISOString().split("T")[0];
    const entry = dailyMap.get(dateStr) || { views: 0, sessions: new Set<string>() };
    entry.views += 1;
    entry.sessions.add(v.session_id);
    dailyMap.set(dateStr, entry);
  }
  const dailyViews = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, views: d.views, sessions: d.sessions.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top pages
  const pageMap = new Map<string, number>();
  for (const v of views) {
    pageMap.set(v.path, (pageMap.get(v.path) || 0) + 1);
  }
  const topPages = Array.from(pageMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // User agent breakdown
  const browserMap = new Map<string, { views: number; sessions: Set<string> }>();
  const deviceMap = new Map<string, number>();
  for (const v of views) {
    if (!v.user_agent) continue;
    const parsed = parseUserAgent(v.user_agent);

    const bEntry = browserMap.get(parsed.browser) || { views: 0, sessions: new Set<string>() };
    bEntry.views += 1;
    bEntry.sessions.add(v.session_id);
    browserMap.set(parsed.browser, bEntry);

    deviceMap.set(parsed.device, (deviceMap.get(parsed.device) || 0) + 1);
  }

  const browsers = Array.from(browserMap.entries())
    .map(([name, d]) => ({ name, views: d.views, sessions: d.sessions.size }))
    .sort((a, b) => b.views - a.views);

  const devices = Array.from(deviceMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Referrers
  const refMap = new Map<string, number>();
  for (const v of views) {
    if (!v.referrer) continue;
    try {
      const hostname = new URL(v.referrer).hostname || "Direto";
      refMap.set(hostname, (refMap.get(hostname) || 0) + 1);
    } catch {
      refMap.set(v.referrer, (refMap.get(v.referrer) || 0) + 1);
    }
  }
  const referrers = Array.from(refMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Event conversion: views per event vs purchases
  const eventViewMap = new Map<string, { views: number; sessions: Set<string> }>();
  for (const v of views) {
    if (!v.event_id) continue;
    const entry = eventViewMap.get(v.event_id) || { views: 0, sessions: new Set<string>() };
    entry.views += 1;
    entry.sessions.add(v.session_id);
    eventViewMap.set(v.event_id, entry);
  }

  // Get event names and order counts
  const eventIds = Array.from(eventViewMap.keys());
  let eventConversion: { event_id: string; title: string; views: number; visitors: number; orders: number; conversion_rate: number }[] = [];

  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .in("id", eventIds);

    // Count orders per event (photos in paid orders grouped by event)
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, photo_id, order_id, orders!inner(status), photos!inner(event_id)")
      .eq("orders.status", "paid");

    const ordersByEvent = new Map<string, Set<string>>();
    for (const item of orderItems || []) {
      const photo = item.photos as unknown as { event_id: string } | null;
      if (!photo?.event_id) continue;
      const set = ordersByEvent.get(photo.event_id) || new Set<string>();
      set.add(item.order_id);
      ordersByEvent.set(photo.event_id, set);
    }

    const eventNameMap = new Map((events || []).map((e) => [e.id, e.title]));

    eventConversion = eventIds.map((eventId) => {
      const viewData = eventViewMap.get(eventId)!;
      const ordersCount = ordersByEvent.get(eventId)?.size || 0;
      const visitors = viewData.sessions.size;
      return {
        event_id: eventId,
        title: eventNameMap.get(eventId) || "Evento removido",
        views: viewData.views,
        visitors,
        orders: ordersCount,
        conversion_rate: visitors > 0 ? Math.round((ordersCount / visitors) * 10000) / 100 : 0,
      };
    }).sort((a, b) => b.views - a.views);
  }

  // Raw user agents for session table
  const uaSessionMap = new Map<string, { sessions: Set<string>; views: number; last_seen: string }>();
  for (const v of views) {
    const ua = v.user_agent || "Desconhecido";
    const entry = uaSessionMap.get(ua) || { sessions: new Set<string>(), views: 0, last_seen: v.created_at };
    entry.sessions.add(v.session_id);
    entry.views += 1;
    if (v.created_at > entry.last_seen) entry.last_seen = v.created_at;
    uaSessionMap.set(ua, entry);
  }
  const userAgents = Array.from(uaSessionMap.entries())
    .map(([raw, d]) => {
      const parsed = parseUserAgent(raw);
      return {
        raw: raw.length > 120 ? raw.substring(0, 120) + "..." : raw,
        browser: parsed.browser,
        device: parsed.device,
        os: parsed.os,
        sessions: d.sessions.size,
        views: d.views,
        last_seen: d.last_seen,
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 50);

  // Totals
  const allSessions = new Set(views.map((v) => v.session_id));

  return {
    daily_views: dailyViews,
    top_pages: topPages,
    browsers,
    devices,
    referrers,
    event_conversion: eventConversion,
    user_agents: userAgents,
    totals: { views: views.length, sessions: allSessions.size },
  };
}

// ─── Route Handler ──────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const section = url.searchParams.get("section") || "overview";
    const { from, to } = parseDateFilters(url);

    switch (section) {
      case "overview":
        return NextResponse.json(await getOverview(from, to));
      case "sales":
        return NextResponse.json(await getSalesByEvent(from, to));
      case "growth":
        return NextResponse.json(await getGrowth());
      case "traffic":
        return NextResponse.json(await getTraffic(from, to));
      default:
        return NextResponse.json({ error: "Section invalida" }, { status: 400 });
    }
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
