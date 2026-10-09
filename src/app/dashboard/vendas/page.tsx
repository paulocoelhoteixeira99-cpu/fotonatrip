"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/cart";
import {
  DollarSign,
  TrendingUp,
  ImageIcon,
  ShoppingBag,
  CalendarDays,
  Users,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

interface OrderGroup {
  order_id: string;
  photo_count: number;
  total_cents: number;
  net_cents?: number;
  created_at: string;
  event_title: string;
  is_package: boolean;
  coupon_code: string | null;
}

interface DailySales {
  date: string;
  total_cents: number;
  count: number;
}

export default function VendasPage() {
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [totalRevenueCents, setTotalRevenueCents] = useState(0);
  const [monthRevenueCents, setMonthRevenueCents] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [payouts, setPayouts] = useState<{ type: string; amount_cents: number; status: string; event_id: string; commission_pct: number | null; created_at: string; order_item_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load all paid sales for this photographer
    const { data } = await supabase
      .from("order_items")
      .select(`
        id, photo_id, price_cents, created_at, order_id,
        orders!inner(status, coupon_code),
        photos!inner(event_id, events(title, price_per_photo_cents))
      `)
      .eq("photographer_id", user.id)
      .eq("orders.status", "paid")
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setLoading(false);
      return;
    }

    // Calculate totals (photographer gets 93%)
    const total = data.reduce((sum: number, s: any) => sum + Math.round(s.price_cents * 0.93), 0);
    setTotalRevenueCents(total);
    setTotalCount(data.length);
    setOrderCount(new Set(data.map((item: any) => item.order_id)).size);

    // Group items by order_id
    const grouped = new Map<string, any[]>();
    for (const item of data) {
      const key = item.order_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    const orderGroups: OrderGroup[] = Array.from(grouped.entries()).map(([orderId, items]) => {
      const first = items[0] as any;
      const eventPrice = first.photos?.events?.price_per_photo_cents || 0;
      const isPackage = items.length > 1 && items[0].price_cents < eventPrice;
      return {
        order_id: orderId,
        photo_count: items.length,
        total_cents: items.reduce((sum: number, i: any) => sum + i.price_cents, 0),
        created_at: first.created_at,
        event_title: first.photos?.events?.title || "Evento",
        is_package: isPackage,
        coupon_code: (first.orders as any)?.coupon_code || null,
      };
    });

    orderGroups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setOrders(orderGroups);

    // Month revenue
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthItems = data.filter(
      (s: any) => new Date(s.created_at) >= monthStart
    );
    const monthTotal = monthItems.reduce(
      (sum: number, s: any) => sum + Math.round(s.price_cents * 0.93),
      0
    );
    setMonthRevenueCents(monthTotal);

    // Daily sales chart — last 30 days up to today, bars grow from the left
    function toLocalDate(d: Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    // Find first sale date in local time
    const todayStr = toLocalDate(new Date());
    const firstSaleStr = data.length > 0
      ? toLocalDate(new Date(data[data.length - 1].created_at))
      : todayStr;
    // Calculate diff from local date strings to avoid timezone drift
    const todayMs = new Date(todayStr + "T00:00:00").getTime();
    const firstMs = new Date(firstSaleStr + "T00:00:00").getTime();
    const diffDays = Math.round((todayMs - firstMs) / (1000 * 60 * 60 * 24));
    const numDays = Math.min(diffDays + 1, 30);

    const days: DailySales[] = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = toLocalDate(date);
      const daySales = data.filter(
        (s: any) => toLocalDate(new Date(s.created_at)) === dateStr
      );
      days.push({
        date: dateStr,
        total_cents: daySales.reduce((sum: number, s: any) => sum + Math.round(s.price_cents * 0.93), 0),
        count: daySales.length,
      });
    }
    setDailySales(days.reverse());

    // Load payouts for shared events
    const { data: payoutData } = await supabase
      .from("payouts")
      .select("type, amount_cents, status, event_id, commission_pct, created_at, order_item_id")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: false });

    if (payoutData) {
      setPayouts(payoutData);

      // Build payout map: order_item_id -> amount the photographer actually receives
      const payoutByItem = new Map<string, number>();
      for (const p of payoutData) {
        if (p.type === "collaborator_payout" || p.type === "host_own_photos") {
          payoutByItem.set(p.order_item_id, p.amount_cents);
        }
      }

      // Recalculate totals using actual payout amounts when available
      if (payoutByItem.size > 0) {
        const recalcTotal = data.reduce((sum: number, item: any) => {
          return sum + (payoutByItem.get(item.id) ?? Math.round(item.price_cents * 0.93));
        }, 0);
        setTotalRevenueCents(recalcTotal);

        const recalcMonth = monthItems.reduce((sum: number, item: any) => {
          return sum + (payoutByItem.get(item.id) ?? Math.round(item.price_cents * 0.93));
        }, 0);
        setMonthRevenueCents(recalcMonth);

        // Recalculate order groups with correct net amounts
        const recalcOrders = orderGroups.map((og) => {
          const groupItems = grouped.get(og.order_id) || [];
          const netCents = groupItems.reduce((sum: number, item: any) => {
            return sum + (payoutByItem.get(item.id) ?? Math.round(item.price_cents * 0.93));
          }, 0);
          return { ...og, net_cents: netCents };
        });
        setOrders(recalcOrders);

        // Recalculate daily chart
        const recalcDays = days.map((day) => {
          const daySalesItems = data.filter(
            (s: any) => toLocalDate(new Date(s.created_at)) === day.date
          );
          return {
            ...day,
            total_cents: daySalesItems.reduce((sum: number, item: any) => {
              return sum + (payoutByItem.get(item.id) ?? Math.round(item.price_cents * 0.93));
            }, 0),
          };
        });
        setDailySales(recalcDays);
      }
    }

    setLoading(false);
  }

  const maxDayRevenue = Math.max(...dailySales.map((d) => d.total_cents), 1);
  const avgTicketCents = totalCount > 0 ? Math.round(totalRevenueCents / totalCount) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <p className="text-muted text-sm mt-1">
          Acompanhe suas vendas e receita.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          {
            label: "Receita total",
            value: formatPrice(totalRevenueCents),
            icon: DollarSign,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Receita do mes",
            value: formatPrice(monthRevenueCents),
            icon: CalendarDays,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
          },
          {
            label: "Vendas",
            value: String(orderCount),
            icon: ShoppingBag,
            color: "text-orange-400",
            bg: "bg-orange-400/10",
          },
          {
            label: "Fotos vendidas",
            value: String(totalCount),
            icon: ImageIcon,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
          },
          {
            label: "Ticket medio",
            value: formatPrice(avgTicketCents),
            icon: TrendingUp,
            color: "text-yellow-400",
            bg: "bg-yellow-400/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-2xl p-6 hover:bg-white/5 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Chart - last 30 days */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-6">Ultimos 30 dias</h2>
        <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ minHeight: 180 }}>
          {dailySales.map((day, i) => {
            const height = maxDayRevenue > 0
              ? Math.max((day.total_cents / maxDayRevenue) * 100, day.count > 0 ? 12 : 4)
              : 4;
            const isToday = i === dailySales.length - 1;
            const dd = day.date.slice(8);
            const mm = day.date.slice(5, 7);
            const valueBrl = day.count > 0 ? Math.round(day.total_cents / 100) : null;
            return (
              <div
                key={day.date}
                className="flex flex-col items-center gap-1 flex-1 min-w-[28px]"
              >
                {valueBrl !== null && (
                  <span className="text-[9px] font-semibold text-primary whitespace-nowrap">
                    R${valueBrl}
                  </span>
                )}
                <div className="w-full flex items-end" style={{ height: 120 }}>
                  <div
                    className={`w-full rounded-t transition-colors ${
                      day.count > 0
                        ? "bg-primary hover:bg-primary/70"
                        : "bg-white/5"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className={`text-[9px] whitespace-nowrap ${isToday ? "text-primary font-semibold" : "text-muted"}`}>
                  {isToday ? "Hoje" : `${dd}/${mm}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {totalCount > 0 && (
        <div className="mb-8">
          <Link
            href="/dashboard/vendas/fotos"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Ver fotos vendidas
          </Link>
        </div>
      )}

      {/* Recent sales table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Vendas recentes</h2>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-muted/20 mx-auto mb-4" />
            <p className="text-muted text-sm">
              Nenhuma venda ainda. Quando clientes comprarem suas fotos, voce vera aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.slice(0, 20).map((order) => {
              const defaultNet = Math.round(order.total_cents * 0.93);
              const netCents = order.net_cents ?? defaultNet;
              const deductions = order.total_cents - netCents;
              return (
                <div
                  key={order.order_id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{order.event_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted">
                        {new Date(order.created_at).toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <span className="text-xs text-muted">·</span>
                      <p className="text-xs text-muted">
                        {order.photo_count} foto{order.photo_count !== 1 ? "s" : ""}
                      </p>
                      {order.is_package ? (
                        <span className="text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                          Pacote
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-white/10 text-muted px-1.5 py-0.5 rounded-full">
                          Avulso
                        </span>
                      )}
                      {order.coupon_code && (
                        <span className="text-[10px] font-medium bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full">
                          {order.coupon_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatPrice(netCents)}
                    </p>
                    <p className="text-[10px] text-muted">
                      -{formatPrice(deductions)} taxas
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared events payouts section */}
      {payouts.length > 0 && (() => {
        const hostCommissions = payouts.filter((p) => p.type === "host_commission");
        const collaboratorPayouts = payouts.filter((p) => p.type === "collaborator_payout");
        const hostOwnPayouts = payouts.filter((p) => p.type === "host_own_photos");

        const totalHostCommissionPending = hostCommissions.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0);
        const totalHostCommissionPaid = hostCommissions.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);
        const totalCollabPending = collaboratorPayouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0);
        const totalCollabPaid = collaboratorPayouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);
        const totalOwnPending = hostOwnPayouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0);
        const totalOwnPaid = hostOwnPayouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);

        const hasHostData = hostCommissions.length > 0 || hostOwnPayouts.length > 0;
        const hasCollabData = collaboratorPayouts.length > 0;

        return (
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Eventos compartilhados
            </h2>

            {hasHostData && (
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-primary" />
                  Recebimentos como anfitriao
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted">Comissoes pendentes</p>
                    <p className="text-lg font-bold text-yellow-400">{formatPrice(totalHostCommissionPending)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Comissoes recebidas</p>
                    <p className="text-lg font-bold text-primary">{formatPrice(totalHostCommissionPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Fotos proprias (pendente)</p>
                    <p className="text-lg font-bold text-yellow-400">{formatPrice(totalOwnPending)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Fotos proprias (recebido)</p>
                    <p className="text-lg font-bold text-primary">{formatPrice(totalOwnPaid)}</p>
                  </div>
                </div>
              </div>
            )}

            {hasCollabData && (
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                  Vendas como colaborador
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted">Pendente de recebimento</p>
                    <p className="text-lg font-bold text-yellow-400">{formatPrice(totalCollabPending)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Ja recebido</p>
                    <p className="text-lg font-bold text-primary">{formatPrice(totalCollabPaid)}</p>
                  </div>
                </div>

                <p className="text-xs text-muted">
                  Repasses semanais via Pix (toda segunda-feira, minimo R$10,00).
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
