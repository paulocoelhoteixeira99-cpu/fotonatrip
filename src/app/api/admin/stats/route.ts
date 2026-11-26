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

// Supabase project max rows is 1000 — paginate with .range()
async function fetchAllPages<T>(
  buildQuery: (start: number, end: number) => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  while (true) {
    const start = page * pageSize;
    const { data, error } = await buildQuery(start, start + pageSize - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return all;
}

function toTimestamp(date: string | null, end = false): string | null {
  if (!date) return null;
  return end ? `${date}T23:59:59+00:00` : `${date}T00:00:00+00:00`;
}

// ─── Overview ───────────────────────────────────────────────

async function getOverview(from: string | null, to: string | null) {
  const supabase = getServiceClient();
  const p_from = toTimestamp(from);
  const p_to = toTimestamp(to, true);

  // All 3 RPCs in parallel + counts
  const [totalsRes, breakdownRes, recentRes, ...countResults] = await Promise.all([
    supabase.rpc("admin_overview_totals", { p_from, p_to }),
    supabase.rpc("admin_photographer_breakdown", { p_from, p_to }),
    supabase.rpc("admin_recent_orders", { p_from, p_to }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("status", "ready"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "photographer"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
  ]);

  const t = totalsRes.data?.[0] || { revenue_cents: 0, platform_fee_cents: 0, orders_count: 0, avg_ticket_cents: 0 };
  const [eventsCount, photosCount, usersCount, photographersCount, clientsCount] = countResults;

  return {
    totals: {
      revenue_cents: Number(t.revenue_cents),
      platform_fee_cents: Number(t.platform_fee_cents),
      photographer_payout_cents: Number(t.revenue_cents) - Number(t.platform_fee_cents),
      orders_count: Number(t.orders_count),
      events_count: eventsCount.count || 0,
      photos_count: photosCount.count || 0,
      users_count: usersCount.count || 0,
      photographers_count: photographersCount.count || 0,
      clients_count: clientsCount.count || 0,
      avg_ticket_cents: Number(t.avg_ticket_cents),
    },
    photographer_breakdown: (breakdownRes.data || []).map((p: any) => ({
      id: p.photographer_id,
      name: p.name,
      revenue_cents: Number(p.revenue_cents),
      platform_fee_cents: Number(p.platform_fee_cents),
      payout_cents: Number(p.payout_cents),
      items_sold: Number(p.items_sold),
    })),
    recent_orders: (recentRes.data || []).map((o: any) => ({
      id: o.id,
      client_email: o.client_email,
      total_cents: o.total_cents,
      platform_fee_cents: o.platform_fee_cents,
      photographer_name: o.photographer_name,
      coupon_code: o.coupon_code || null,
      discount_cents: o.discount_cents || 0,
      photo_count: Number(o.photo_count),
      event_name: o.event_name || null,
      event_id: o.event_id || null,
      created_at: o.created_at,
    })),
  };
}

// ─── Sales by Event ─────────────────────────────────────────

async function getSalesByEvent(from: string | null, to: string | null) {
  const supabase = getServiceClient();
  const p_from = toTimestamp(from);
  const p_to = toTimestamp(to, true);

  const { data } = await supabase.rpc("admin_sales_by_event", { p_from, p_to });

  const eventSales = (data || []).map((e: any) => ({
    id: e.event_id,
    title: e.title,
    photographer: e.photographer,
    photo_count: e.photo_count,
    price_cents: e.price_cents,
    status: e.status,
    items_sold: Number(e.items_sold),
    orders_count: Number(e.orders_count),
    revenue_cents: Number(e.revenue_cents),
    platform_fee_cents: Number(e.platform_fee_cents),
  }));

  return { event_sales: eventSales };
}

// ─── Growth ─────────────────────────────────────────────────

async function getGrowth() {
  const supabase = getServiceClient();

  // Profiles still fetched individually (need per-day breakdown for chart)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .order("created_at", { ascending: true })
    .limit(10000);

  // Daily registration data (last 60 days)
  // Use São Paulo timezone so "today" matches Brazil's date
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const dailyGrowth: { date: string; clients: number; photographers: number }[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(todayStr + "T12:00:00");
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

  // Monthly revenue via RPC
  const { data: monthlyData } = await supabase.rpc("admin_monthly_revenue", { p_months: 6 });

  const monthlyRevenue = (monthlyData || []).map((m: any) => ({
    month: m.month,
    revenue_cents: Number(m.revenue_cents),
    platform_fee_cents: Number(m.platform_fee_cents),
    orders_count: Number(m.orders_count),
  }));

  return { daily_growth: dailyGrowth, cumulative_growth: cumulativeGrowth, monthly_revenue: monthlyRevenue };
}

// ─── Traffic ────────────────────────────────────────────────

function parseUserAgent(ua: string): { browser: string; device: string; os: string } {
  let browser = "Outro";
  let device = "Desktop";
  let os = "Outro";

  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox\//i.test(ua)) browser = "Firefox";

  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  if (/mobile|android|iphone|ipod/i.test(ua)) device = "Mobile";
  else if (/ipad|tablet/i.test(ua)) device = "Tablet";

  return { browser, device, os };
}

async function getTraffic(from: string | null, to: string | null) {
  const supabase = getServiceClient();

  // Default to last 60 days if no date filter provided
  const effectiveFrom = from || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return d.toISOString().split("T")[0];
  })();

  // Page views (user-agent parsing needs raw data — paginate)
  const views = await fetchAllPages<any>((start, end) => {
    let q = supabase
      .from("page_views")
      .select("id, path, event_id, user_agent, referrer, session_id, created_at")
      .order("created_at", { ascending: false })
      .gte("created_at", `${effectiveFrom}T00:00:00`)
      .range(start, end);
    if (to) q = q.lte("created_at", `${to}T23:59:59`);
    return q;
  });

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
    // Event names + orders via RPC in parallel
    const [eventsRes, ordersRes] = await Promise.all([
      supabase.from("events").select("id, title").in("id", eventIds),
      supabase.rpc("admin_orders_by_event"),
    ]);

    const ordersByEvent = new Map<string, number>();
    for (const row of ordersRes.data || []) {
      ordersByEvent.set(row.event_id, Number(row.orders_count));
    }

    const eventNameMap = new Map((eventsRes.data || []).map((e: any) => [e.id, e.title]));

    eventConversion = eventIds.map((eventId) => {
      const viewData = eventViewMap.get(eventId)!;
      const ordersCount = ordersByEvent.get(eventId) || 0;
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
