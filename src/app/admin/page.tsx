"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

interface Stats {
  totals: {
    revenue_cents: number;
    platform_fee_cents: number;
    photographer_payout_cents: number;
    orders_count: number;
    events_count: number;
    photos_count: number;
    users_count: number;
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
    created_at: string;
  }[];
}

type Period = "all" | "month" | "week" | "custom";

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (authorized) loadStats();
  }, [authorized, period, customFrom, customTo]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!data || data.role !== "admin") {
      router.push("/");
      return;
    }

    setAuthorized(true);
  }

  async function loadStats() {
    setLoading(true);
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

    const res = await fetch(`/api/admin/stats?${params.toString()}`);
    if (res.ok) {
      setStats(await res.json());
    }
    setLoading(false);
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
            className="flex items-center gap-2 text-sm text-muted hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
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
                period === key
                  ? "bg-primary text-white"
                  : "glass hover:bg-white/10 text-muted"
              }`}
            >
              {label}
            </button>
          ))}

          {period === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary [color-scheme:dark]"
              />
              <span className="text-muted text-sm">ate</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary [color-scheme:dark]"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={DollarSign}
                label="Total vendas"
                value={formatPrice(stats.totals.revenue_cents)}
                accent="text-green-400"
              />
              <StatCard
                icon={TrendingUp}
                label="Comissao plataforma (7%)"
                value={formatPrice(stats.totals.platform_fee_cents)}
                accent="text-primary"
              />
              <StatCard
                icon={Camera}
                label="Repasse fotografos (93%)"
                value={formatPrice(stats.totals.photographer_payout_cents)}
                accent="text-blue-400"
              />
              <StatCard
                icon={ShoppingBag}
                label="Pedidos pagos"
                value={String(stats.totals.orders_count)}
                accent="text-yellow-400"
              />
            </div>

            {/* General stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="glass rounded-xl p-4 flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-muted" />
                <div>
                  <p className="text-xs text-muted">Eventos</p>
                  <p className="text-lg font-bold">{stats.totals.events_count}</p>
                </div>
              </div>
              <div className="glass rounded-xl p-4 flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-muted" />
                <div>
                  <p className="text-xs text-muted">Fotos</p>
                  <p className="text-lg font-bold">{stats.totals.photos_count.toLocaleString("pt-BR")}</p>
                </div>
              </div>
              <div className="glass rounded-xl p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-muted" />
                <div>
                  <p className="text-xs text-muted">Usuarios</p>
                  <p className="text-lg font-bold">{stats.totals.users_count}</p>
                </div>
              </div>
            </div>

            {/* Photographer breakdown */}
            {stats.photographer_breakdown.length > 0 && (
              <div className="glass rounded-2xl p-6 mb-8">
                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  Vendas por fotografo
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
                      {stats.photographer_breakdown.map((p) => (
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
            {stats.recent_orders.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Pedidos recentes
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted border-b border-border">
                        <th className="pb-3 font-medium">Data</th>
                        <th className="pb-3 font-medium">Cliente</th>
                        <th className="pb-3 font-medium text-right">Total</th>
                        <th className="pb-3 font-medium text-right">Plataforma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_orders.map((o) => (
                        <tr key={o.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 text-muted">
                            {new Date(o.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3">{o.client_email}</td>
                          <td className="py-3 text-right text-green-400">{formatPrice(o.total_cents)}</td>
                          <td className="py-3 text-right text-primary">{formatPrice(o.platform_fee_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state */}
            {stats.totals.orders_count === 0 && (
              <div className="glass rounded-2xl p-10 text-center">
                <ShoppingBag className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                <p className="text-muted">Nenhuma venda registrada neste periodo.</p>
              </div>
            )}
          </>
        ) : (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-muted">Erro ao carregar dados.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${accent}`} />
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
