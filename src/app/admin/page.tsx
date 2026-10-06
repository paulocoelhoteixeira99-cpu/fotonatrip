"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/cart";
import {
  DollarSign,
  TrendingUp,
  Users,
  ImageIcon,
  CalendarDays,
  ShoppingBag,
  Loader2,
  LogOut,
  ShieldCheck,
  Camera,
  Home,
  LayoutDashboard,
  BarChart3,
  Globe,
  UserPlus,
  Eye,
  MousePointerClick,
  Monitor,
  Smartphone,
  ArrowUpRight,
  ExternalLink,
  Tag,
  Plus,
  Trash2,
  Power,
  Check,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

type Tab = "overview" | "sales" | "growth" | "traffic" | "coupons";
type Period = "all" | "month" | "week" | "custom";

interface OverviewStats {
  totals: {
    revenue_cents: number;
    platform_fee_cents: number;
    photographer_payout_cents: number;
    orders_count: number;
    events_count: number;
    photos_count: number;
    users_count: number;
    photographers_count: number;
    clients_count: number;
    avg_ticket_cents: number;
  };
  photographer_breakdown: {
    id: string;
    name: string;
    revenue_cents: number;
    platform_fee_cents: number;
    payout_cents: number;
    items_sold: number;
  }[];
  recent_orders: {
    id: string;
    client_email: string;
    total_cents: number;
    platform_fee_cents: number;
    photographer_name: string;
    coupon_code: string | null;
    discount_cents: number;
    created_at: string;
  }[];
}

interface EventSale {
  id: string;
  title: string;
  photographer: string;
  photo_count: number;
  price_cents: number;
  status: string;
  items_sold: number;
  orders_count: number;
  revenue_cents: number;
  platform_fee_cents: number;
}

interface GrowthData {
  daily_growth: { date: string; clients: number; photographers: number }[];
  cumulative_growth: { date: string; total_clients: number; total_photographers: number }[];
}

interface TrafficData {
  daily_views: { date: string; views: number; sessions: number }[];
  top_pages: { path: string; count: number }[];
  browsers: { name: string; views: number; sessions: number }[];
  devices: { name: string; count: number }[];
  referrers: { source: string; count: number }[];
  event_conversion: {
    event_id: string;
    title: string;
    views: number;
    visitors: number;
    orders: number;
    conversion_rate: number;
  }[];
  user_agents: {
    raw: string;
    browser: string;
    device: string;
    os: string;
    sessions: number;
    views: number;
    last_seen: string;
  }[];
  totals: { views: number; sessions: number };
}

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_cents: number | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${accent}`} />
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="w-full bg-white/5 rounded-full h-2">
      <div className={`${color} rounded-full h-2 transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatDateFull(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Bar Chart Component ────────────────────────────────────

function BarChart({
  data,
  bars,
  labelKey,
  height = 160,
}: {
  data: Record<string, unknown>[];
  bars: { key: string; color: string; label: string }[];
  labelKey: string;
  height?: number;
}) {
  if (data.length === 0) return <p className="text-muted text-sm text-center py-8">Sem dados ainda.</p>;

  const maxVal = Math.max(
    ...data.flatMap((d) => bars.map((b) => (d[b.key] as number) || 0)),
    1
  );

  // Show at most ~30 bars
  const step = Math.max(1, Math.floor(data.length / 30));
  const filtered = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        {bars.map((b) => (
          <div key={b.key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${b.color}`} />
            <span className="text-xs text-muted">{b.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-[2px] overflow-x-auto pb-1" style={{ minHeight: height }}>
        {filtered.map((d, i) => {
          const dateStr = d[labelKey] as string;
          const isLast = i === filtered.length - 1;
          const dd = dateStr.slice(8, 10);
          const mm = dateStr.slice(5, 7);
          return (
            <div key={dateStr} className="flex flex-col items-center gap-0.5 flex-1 min-w-[18px]">
              <div className="w-full flex items-end gap-[1px]" style={{ height: height - 30 }}>
                {bars.map((b) => {
                  const val = (d[b.key] as number) || 0;
                  const pct = Math.max((val / maxVal) * 100, val > 0 ? 6 : 2);
                  return (
                    <div
                      key={b.key}
                      className={`flex-1 rounded-t transition-colors ${val > 0 ? b.color : "bg-white/5"} hover:opacity-80`}
                      style={{ height: `${pct}%` }}
                      title={`${b.label}: ${val}`}
                    />
                  );
                })}
              </div>
              <span className={`text-[8px] whitespace-nowrap ${isLast ? "text-primary font-semibold" : "text-muted"}`}>
                {isLast ? "Hoje" : `${dd}/${mm}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Tab data
  const [overviewData, setOverviewData] = useState<OverviewStats | null>(null);
  const [salesData, setSalesData] = useState<{ event_sales: EventSale[] } | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [couponsData, setCouponsData] = useState<Coupon[]>([]);

  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (period === "month") {
      const now = new Date();
      params.set("from", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
    } else if (period === "week") {
      const now = new Date();
      now.setDate(now.getDate() - 7);
      params.set("from", now.toISOString().split("T")[0]);
    } else if (period === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    }
    return params;
  }, [period, customFrom, customTo]);

  const loadCoupons = useCallback(async () => {
    const res = await fetch("/api/admin/coupons");
    if (res.ok) {
      const json = await res.json();
      setCouponsData(json.coupons || []);
    }
  }, []);

  const loadTabData = useCallback(async (tab: Tab) => {
    setLoading(true);
    if (tab === "coupons") {
      await loadCoupons();
    } else {
      const params = buildParams();
      params.set("section", tab);
      const res = await fetch(`/api/admin/stats?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        switch (tab) {
          case "overview": setOverviewData(json); break;
          case "sales": setSalesData(json); break;
          case "growth": setGrowthData(json); break;
          case "traffic": setTrafficData(json); break;
        }
      }
    }
    setLoading(false);
  }, [buildParams, loadCoupons]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!data || data.role !== "admin") { router.push("/"); return; }
      setAuthorized(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authorized) loadTabData(activeTab);
  }, [authorized, activeTab, loadTabData]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: "Visao Geral", icon: BarChart3 },
    { key: "sales", label: "Vendas por Evento", icon: ShoppingBag },
    { key: "growth", label: "Crescimento", icon: UserPlus },
    { key: "traffic", label: "Trafego", icon: Globe },
    { key: "coupons", label: "Cupons", icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
              <Home className="w-4 h-4" /> Home
            </button>
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} className="flex items-center gap-2 text-sm text-muted hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 mb-6 border-b border-border pb-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {([
            ["all", "Todo periodo"],
            ["month", "Este mes"],
            ["week", "Ultimos 7 dias"],
            ["custom", "Personalizado"],
          ] as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                period === key ? "bg-primary text-white" : "glass hover:bg-white/10 text-muted"
              }`}
            >
              {label}
            </button>
          ))}
          {period === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary [color-scheme:dark]" />
              <span className="text-muted text-sm">ate</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary [color-scheme:dark]" />
            </div>
          )}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "overview" && overviewData && <OverviewTab data={overviewData} />}
            {activeTab === "sales" && salesData && <SalesTab data={salesData} />}
            {activeTab === "growth" && growthData && <GrowthTab data={growthData} />}
            {activeTab === "traffic" && trafficData && <TrafficTab data={trafficData} />}
            {activeTab === "coupons" && <CouponsTab coupons={couponsData} onRefresh={loadCoupons} />}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────

function OverviewTab({ data }: { data: OverviewStats }) {
  const t = data.totals;
  return (
    <>
      {/* Financial cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Total vendas" value={formatPrice(t.revenue_cents)} accent="text-green-400" />
        <StatCard icon={TrendingUp} label="Comissao (7%)" value={formatPrice(t.platform_fee_cents)} accent="text-primary" />
        <StatCard icon={Camera} label="Repasse (93%)" value={formatPrice(t.photographer_payout_cents)} accent="text-blue-400" />
        <StatCard icon={ShoppingBag} label="Pedidos pagos" value={String(t.orders_count)} accent="text-yellow-400" />
        <StatCard icon={TrendingUp} label="Ticket medio" value={formatPrice(t.avg_ticket_cents)} accent="text-purple-400" />
      </div>

      {/* General counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-muted" />
          <div>
            <p className="text-xs text-muted">Eventos</p>
            <p className="text-lg font-bold">{t.events_count}</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <ImageIcon className="w-5 h-5 text-muted" />
          <div>
            <p className="text-xs text-muted">Fotos</p>
            <p className="text-lg font-bold">{t.photos_count.toLocaleString("pt-BR")}</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-muted" />
          <div>
            <p className="text-xs text-muted">Total usuarios</p>
            <p className="text-lg font-bold">{t.users_count}</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <Camera className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted">Fotografos</p>
            <p className="text-lg font-bold">{t.photographers_count}</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-xs text-muted">Clientes</p>
            <p className="text-lg font-bold">{t.clients_count}</p>
          </div>
        </div>
      </div>

      {/* Photographer breakdown */}
      {data.photographer_breakdown.length > 0 && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Vendas por fotografo
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-3 font-medium">Fotografo</th>
                  <th className="pb-3 font-medium text-right">Fotos vendidas</th>
                  <th className="pb-3 font-medium text-right">Receita total</th>
                  <th className="pb-3 font-medium text-right">Plataforma (7%)</th>
                  <th className="pb-3 font-medium text-right">Repasse (93%)</th>
                </tr>
              </thead>
              <tbody>
                {data.photographer_breakdown.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium">{p.name}</td>
                    <td className="py-3 text-right text-muted">{p.items_sold}</td>
                    <td className="py-3 text-right text-green-400">{formatPrice(p.revenue_cents)}</td>
                    <td className="py-3 text-right text-primary">{formatPrice(p.platform_fee_cents)}</td>
                    <td className="py-3 text-right text-blue-400">{formatPrice(p.payout_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent orders */}
      {data.recent_orders.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Pedidos recentes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Cliente</th>
                  <th className="pb-3 font-medium">Fotografo</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-right">Plataforma</th>
                  <th className="pb-3 font-medium text-center">Cupom</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 text-muted">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3">{o.client_email}</td>
                    <td className="py-3 text-muted">{o.photographer_name}</td>
                    <td className="py-3 text-right text-green-400">{formatPrice(o.total_cents)}</td>
                    <td className="py-3 text-right text-primary">{formatPrice(o.platform_fee_cents)}</td>
                    <td className="py-3 text-center">
                      {o.coupon_code ? (
                        <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full" title={`-${formatPrice(o.discount_cents)}`}>
                          {o.coupon_code}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.totals.orders_count === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <ShoppingBag className="w-12 h-12 text-muted/30 mx-auto mb-4" />
          <p className="text-muted">Nenhuma venda registrada neste periodo.</p>
        </div>
      )}
    </>
  );
}

// ─── Sales by Event Tab ─────────────────────────────────────

function SalesTab({ data }: { data: { event_sales: EventSale[] } }) {
  const withSales = data.event_sales.filter((e) => e.items_sold > 0);
  const withoutSales = data.event_sales.filter((e) => e.items_sold === 0);
  const maxRevenue = Math.max(...data.event_sales.map((e) => e.revenue_cents), 1);

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={CalendarDays}
          label="Eventos com vendas"
          value={String(withSales.length)}
          accent="text-green-400"
          sub={`de ${data.event_sales.length} total`}
        />
        <StatCard
          icon={ImageIcon}
          label="Total fotos vendidas"
          value={String(withSales.reduce((s, e) => s + e.items_sold, 0))}
          accent="text-primary"
        />
        <StatCard
          icon={DollarSign}
          label="Receita total"
          value={formatPrice(withSales.reduce((s, e) => s + e.revenue_cents, 0))}
          accent="text-green-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Comissao total"
          value={formatPrice(withSales.reduce((s, e) => s + e.platform_fee_cents, 0))}
          accent="text-yellow-400"
        />
      </div>

      {/* Events with sales */}
      {withSales.length > 0 && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Eventos com vendas
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-3 font-medium">Evento</th>
                  <th className="pb-3 font-medium">Fotografo</th>
                  <th className="pb-3 font-medium text-right">Fotos</th>
                  <th className="pb-3 font-medium text-right">Vendidas</th>
                  <th className="pb-3 font-medium text-right">Pedidos</th>
                  <th className="pb-3 font-medium text-right">Preco unit.</th>
                  <th className="pb-3 font-medium text-right">Receita</th>
                  <th className="pb-3 font-medium w-32"></th>
                </tr>
              </thead>
              <tbody>
                {withSales.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium max-w-[200px] truncate">{e.title}</td>
                    <td className="py-3 text-muted">{e.photographer}</td>
                    <td className="py-3 text-right text-muted">{e.photo_count}</td>
                    <td className="py-3 text-right text-primary">{e.items_sold}</td>
                    <td className="py-3 text-right text-muted">{e.orders_count}</td>
                    <td className="py-3 text-right text-muted">{formatPrice(e.price_cents)}</td>
                    <td className="py-3 text-right text-green-400 font-medium">{formatPrice(e.revenue_cents)}</td>
                    <td className="py-3 pl-3">
                      <MiniBar value={e.revenue_cents} max={maxRevenue} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events without sales */}
      {withoutSales.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-muted">
            <CalendarDays className="w-4 h-4" /> Eventos sem vendas ({withoutSales.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-3 font-medium">Evento</th>
                  <th className="pb-3 font-medium">Fotografo</th>
                  <th className="pb-3 font-medium text-right">Fotos</th>
                  <th className="pb-3 font-medium text-right">Preco</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {withoutSales.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium max-w-[200px] truncate text-muted">{e.title}</td>
                    <td className="py-3 text-muted">{e.photographer}</td>
                    <td className="py-3 text-right text-muted">{e.photo_count}</td>
                    <td className="py-3 text-right text-muted">{formatPrice(e.price_cents)}</td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        e.status === "active" ? "bg-green-500/15 text-green-400" :
                        e.status === "scheduled" ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-white/10 text-muted"
                      }`}>
                        {e.status === "active" ? "Ativo" : e.status === "scheduled" ? "Agendado" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Growth Tab ─────────────────────────────────────────────

function GrowthTab({ data }: { data: GrowthData }) {
  const lastCum = data.cumulative_growth[data.cumulative_growth.length - 1];
  const totalNow = lastCum ? lastCum.total_clients + lastCum.total_photographers : 0;

  // Last 30 days signups
  const last30 = data.daily_growth.slice(-30);
  const newClientsLast30 = last30.reduce((s, d) => s + d.clients, 0);
  const newPhotographersLast30 = last30.reduce((s, d) => s + d.photographers, 0);

  // Last 7 days
  const last7 = data.daily_growth.slice(-7);
  const newClientsLast7 = last7.reduce((s, d) => s + d.clients, 0);
  const newPhotographersLast7 = last7.reduce((s, d) => s + d.photographers, 0);

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total usuarios" value={String(totalNow)} accent="text-white" />
        <StatCard
          icon={UserPlus}
          label="Novos (7 dias)"
          value={String(newClientsLast7 + newPhotographersLast7)}
          accent="text-green-400"
          sub={`${newClientsLast7} clientes, ${newPhotographersLast7} fotografos`}
        />
        <StatCard
          icon={UserPlus}
          label="Novos (30 dias)"
          value={String(newClientsLast30 + newPhotographersLast30)}
          accent="text-blue-400"
          sub={`${newClientsLast30} clientes, ${newPhotographersLast30} fotografos`}
        />
        <StatCard
          icon={Camera}
          label="Total fotografos"
          value={String(lastCum?.total_photographers || 0)}
          accent="text-primary"
          sub={`${lastCum?.total_clients || 0} clientes`}
        />
      </div>

      {/* Daily new signups chart */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" /> Novos cadastros por dia (ultimos 90 dias)
        </h2>
        <BarChart
          data={data.daily_growth}
          bars={[
            { key: "clients", color: "bg-blue-400", label: "Clientes" },
            { key: "photographers", color: "bg-primary", label: "Fotografos" },
          ]}
          labelKey="date"
          height={180}
        />
      </div>

      {/* Cumulative growth chart */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Crescimento acumulado (ultimos 90 dias)
        </h2>
        <BarChart
          data={data.cumulative_growth}
          bars={[
            { key: "total_clients", color: "bg-blue-400", label: "Clientes" },
            { key: "total_photographers", color: "bg-primary", label: "Fotografos" },
          ]}
          labelKey="date"
          height={180}
        />
      </div>
    </>
  );
}

// ─── Traffic Tab ────────────────────────────────────────────

function TrafficTab({ data }: { data: TrafficData }) {
  const totalDevices = data.devices.reduce((s, d) => s + d.count, 0);

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Eye} label="Page views" value={data.totals.views.toLocaleString("pt-BR")} accent="text-blue-400" />
        <StatCard icon={Users} label="Sessoes unicas" value={data.totals.sessions.toLocaleString("pt-BR")} accent="text-primary" />
        <StatCard
          icon={MousePointerClick}
          label="Paginas/sessao"
          value={data.totals.sessions > 0 ? (data.totals.views / data.totals.sessions).toFixed(1) : "0"}
          accent="text-yellow-400"
        />
        <StatCard
          icon={Smartphone}
          label="Mobile"
          value={`${totalDevices > 0 ? Math.round(((data.devices.find((d) => d.name === "Mobile")?.count || 0) / totalDevices) * 100) : 0}%`}
          accent="text-purple-400"
          sub={`Desktop: ${totalDevices > 0 ? Math.round(((data.devices.find((d) => d.name === "Desktop")?.count || 0) / totalDevices) * 100) : 0}%`}
        />
      </div>

      {data.totals.views === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Globe className="w-12 h-12 text-muted/30 mx-auto mb-4" />
          <p className="text-muted">Nenhum dado de trafego ainda.</p>
          <p className="text-muted text-xs mt-2">Os dados comecarao a aparecer conforme visitantes acessam o site.</p>
        </div>
      ) : (
        <>
          {/* Daily views chart */}
          <div className="glass rounded-2xl p-6 mb-8">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> Visualizacoes por dia
            </h2>
            <BarChart
              data={data.daily_views}
              bars={[
                { key: "views", color: "bg-blue-400", label: "Page views" },
                { key: "sessions", color: "bg-primary", label: "Sessoes" },
              ]}
              labelKey="date"
              height={180}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top pages */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-primary" /> Paginas mais visitadas
              </h2>
              <div className="space-y-2">
                {data.top_pages.map((p) => {
                  const maxCount = data.top_pages[0]?.count || 1;
                  return (
                    <div key={p.path} className="flex items-center gap-3">
                      <span className="text-xs text-muted font-mono truncate flex-1 min-w-0">{p.path}</span>
                      <span className="text-xs text-white font-medium w-10 text-right">{p.count}</span>
                      <div className="w-20">
                        <MiniBar value={p.count} max={maxCount} color="bg-blue-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Browsers & Devices */}
            <div className="space-y-8">
              <div className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" /> Navegadores
                </h2>
                <div className="space-y-2">
                  {data.browsers.map((b) => {
                    const maxViews = data.browsers[0]?.views || 1;
                    return (
                      <div key={b.name} className="flex items-center gap-3">
                        <span className="text-sm w-20">{b.name}</span>
                        <div className="flex-1">
                          <MiniBar value={b.views} max={maxViews} color="bg-primary" />
                        </div>
                        <span className="text-xs text-muted w-16 text-right">{b.sessions} sess.</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Devices */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" /> Dispositivos
                </h2>
                <div className="flex gap-4">
                  {data.devices.map((d) => {
                    const pct = totalDevices > 0 ? Math.round((d.count / totalDevices) * 100) : 0;
                    return (
                      <div key={d.name} className="flex-1 text-center">
                        <p className="text-2xl font-bold text-primary">{pct}%</p>
                        <p className="text-xs text-muted mt-1">{d.name}</p>
                        <p className="text-xs text-muted">{d.count} views</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Referrers */}
          {data.referrers.length > 0 && (
            <div className="glass rounded-2xl p-6 mb-8">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-primary" /> Fontes de trafego
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {data.referrers.map((r) => (
                  <div key={r.source} className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-sm font-medium truncate">{r.source}</p>
                    <p className="text-lg font-bold text-primary mt-1">{r.count}</p>
                    <p className="text-xs text-muted">visitas</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Conversion */}
          {data.event_conversion.length > 0 && (
            <div className="glass rounded-2xl p-6 mb-8">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-primary" /> Conversao por evento (visitas vs compras)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th className="pb-3 font-medium">Evento</th>
                      <th className="pb-3 font-medium text-right">Views</th>
                      <th className="pb-3 font-medium text-right">Visitantes</th>
                      <th className="pb-3 font-medium text-right">Compras</th>
                      <th className="pb-3 font-medium text-right">Conversao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.event_conversion.map((e) => (
                      <tr key={e.event_id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 font-medium max-w-[250px] truncate">{e.title}</td>
                        <td className="py-3 text-right text-muted">{e.views}</td>
                        <td className="py-3 text-right text-blue-400">{e.visitors}</td>
                        <td className="py-3 text-right text-green-400">{e.orders}</td>
                        <td className="py-3 text-right">
                          <span className={`font-medium ${e.conversion_rate > 0 ? "text-primary" : "text-muted"}`}>
                            {e.conversion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* User Agent / Session table */}
          {data.user_agents.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" /> Sessoes por User Agent
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th className="pb-3 font-medium">Navegador</th>
                      <th className="pb-3 font-medium">SO</th>
                      <th className="pb-3 font-medium">Dispositivo</th>
                      <th className="pb-3 font-medium text-right">Sessoes</th>
                      <th className="pb-3 font-medium text-right">Views</th>
                      <th className="pb-3 font-medium">Ultimo acesso</th>
                      <th className="pb-3 font-medium">User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.user_agents.map((ua, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-3 font-medium">{ua.browser}</td>
                        <td className="py-3 text-muted">{ua.os}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ua.device === "Mobile" ? "bg-purple-500/15 text-purple-400" :
                            ua.device === "Tablet" ? "bg-yellow-500/15 text-yellow-400" :
                            "bg-white/10 text-muted"
                          }`}>
                            {ua.device}
                          </span>
                        </td>
                        <td className="py-3 text-right text-primary font-medium">{ua.sessions}</td>
                        <td className="py-3 text-right text-muted">{ua.views}</td>
                        <td className="py-3 text-muted text-xs">{formatDateFull(ua.last_seen)}</td>
                        <td className="py-3 text-muted text-[10px] font-mono max-w-[200px] truncate">{ua.raw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── Coupons Tab ────────────────────────────────────────────

function CouponsTab({ coupons, onRefresh }: { coupons: Coupon[]; onRefresh: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  async function handleCreate() {
    if (!code.trim() || !discountValue) return;
    setFormLoading(true);
    setFormError(null);

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        discount_type: discountType,
        discount_value: discountType === "fixed"
          ? Math.round(parseFloat(discountValue) * 100)
          : parseInt(discountValue),
        min_order_cents: minOrder ? Math.round(parseFloat(minOrder) * 100) : null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error);
    } else {
      setShowForm(false);
      setCode("");
      setDiscountValue("");
      setMinOrder("");
      setMaxUses("");
      setExpiresAt("");
      await onRefresh();
    }
    setFormLoading(false);
  }

  async function handleToggle(coupon: Coupon) {
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: coupon.id, active: !coupon.active }),
    });
    await onRefresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    await onRefresh();
  }

  const activeCoupons = coupons.filter((c) => c.active);
  const inactiveCoupons = coupons.filter((c) => !c.active);
  const totalUsed = coupons.reduce((s, c) => s + c.used_count, 0);

  return (
    <>
      {/* Summary + create button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          <StatCard icon={Tag} label="Cupons ativos" value={String(activeCoupons.length)} accent="text-primary" />
          <StatCard icon={Check} label="Total utilizados" value={String(totalUsed)} accent="text-green-400" />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo cupom
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Criar novo cupom
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Codigo do cupom</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: BEMVINDO10"
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Tipo de desconto</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary [color-scheme:dark]"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">
                {discountType === "percentage" ? "Percentual (%)" : "Valor (R$)"}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "10" : "5.00"}
                min="1"
                max={discountType === "percentage" ? "100" : undefined}
                step={discountType === "fixed" ? "0.01" : "1"}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Pedido minimo (R$, opcional)</label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Usos maximos (opcional)</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ilimitado"
                min="1"
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Validade (opcional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary [color-scheme:dark]"
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-400 mt-3">{formError}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleCreate}
              disabled={formLoading || !code.trim() || !discountValue}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Criar cupom
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="px-5 py-2.5 text-sm text-muted hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Coupons table */}
      {coupons.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Tag className="w-12 h-12 text-muted/30 mx-auto mb-4" />
          <p className="text-muted">Nenhum cupom criado ainda.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Todos os cupons
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-3 font-medium">Codigo</th>
                  <th className="pb-3 font-medium">Desconto</th>
                  <th className="pb-3 font-medium text-right">Pedido min.</th>
                  <th className="pb-3 font-medium text-right">Usos</th>
                  <th className="pb-3 font-medium">Validade</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                  <th className="pb-3 font-medium text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                  const isMaxed = c.max_uses !== null && c.used_count >= c.max_uses;
                  return (
                    <tr key={c.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 font-mono font-bold text-primary">{c.code}</td>
                      <td className="py-3">
                        {c.discount_type === "percentage"
                          ? `${c.discount_value}%`
                          : formatPrice(c.discount_value)}
                      </td>
                      <td className="py-3 text-right text-muted">
                        {c.min_order_cents ? formatPrice(c.min_order_cents) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-white">{c.used_count}</span>
                        <span className="text-muted">/{c.max_uses ?? "∞"}</span>
                      </td>
                      <td className="py-3 text-muted">
                        {c.expires_at
                          ? new Date(c.expires_at).toLocaleDateString("pt-BR")
                          : "Sem validade"}
                        {isExpired && <span className="text-red-400 text-xs ml-1">(expirado)</span>}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          !c.active ? "bg-white/10 text-muted" :
                          isExpired || isMaxed ? "bg-yellow-500/15 text-yellow-400" :
                          "bg-green-500/15 text-green-400"
                        }`}>
                          {!c.active ? "Inativo" : isExpired ? "Expirado" : isMaxed ? "Esgotado" : "Ativo"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggle(c)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              c.active ? "text-yellow-400 hover:bg-yellow-400/10" : "text-green-400 hover:bg-green-400/10"
                            }`}
                            title={c.active ? "Desativar" : "Ativar"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
