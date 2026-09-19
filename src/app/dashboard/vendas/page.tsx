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
} from "lucide-react";

interface Sale {
  id: string;
  photo_id: string;
  price_cents: number;
  created_at: string;
  event_title: string;
}

interface DailySales {
  date: string;
  total_cents: number;
  count: number;
}

export default function VendasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalRevenueCents, setTotalRevenueCents] = useState(0);
  const [monthRevenueCents, setMonthRevenueCents] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
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
        id, photo_id, price_cents, created_at,
        orders!inner(status),
        photos!inner(event_id, events(title))
      `)
      .eq("photographer_id", user.id)
      .eq("orders.status", "paid")
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setLoading(false);
      return;
    }

    const salesMapped: Sale[] = data.map((item: any) => ({
      id: item.id,
      photo_id: item.photo_id,
      price_cents: item.price_cents,
      created_at: item.created_at,
      event_title: item.photos?.events?.title || "Evento",
    }));

    setSales(salesMapped);

    // Calculate totals (photographer gets 93%)
    const total = salesMapped.reduce((sum, s) => sum + Math.round(s.price_cents * 0.93), 0);
    setTotalRevenueCents(total);
    setTotalCount(salesMapped.length);

    // Month revenue
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSales = salesMapped.filter(
      (s) => new Date(s.created_at) >= monthStart
    );
    const monthTotal = monthSales.reduce(
      (sum, s) => sum + Math.round(s.price_cents * 0.93),
      0
    );
    setMonthRevenueCents(monthTotal);

    // Daily sales chart — last 30 days up to today, bars grow from the left
    function toLocalDate(d: Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    const firstSale = salesMapped.length > 0
      ? new Date(salesMapped[salesMapped.length - 1].created_at)
      : new Date();
    const today = new Date();
    const diffDays = Math.ceil((today.getTime() - firstSale.getTime()) / (1000 * 60 * 60 * 24));
    const numDays = Math.min(diffDays + 1, 30);

    const days: DailySales[] = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = toLocalDate(date);
      const daySales = salesMapped.filter(
        (s) => toLocalDate(new Date(s.created_at)) === dateStr
      );
      days.push({
        date: dateStr,
        total_cents: daySales.reduce((sum, s) => sum + Math.round(s.price_cents * 0.93), 0),
        count: daySales.length,
      });
    }
    setDailySales(days);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <div className="flex items-end gap-[3px] h-40">
          {dailySales.map((day) => {
            const height = maxDayRevenue > 0
              ? Math.max((day.total_cents / maxDayRevenue) * 100, day.count > 0 ? 8 : 2)
              : 2;
            return (
              <div
                key={day.date}
                className="group relative h-full flex items-end"
                style={{ width: `${100 / 30}%` }}
              >
                <div
                  className={`w-full rounded-t transition-colors ${
                    day.count > 0
                      ? "bg-primary hover:bg-primary/70"
                      : "bg-white/5"
                  }`}
                  style={{ height: `${height}%` }}
                />
                {day.count > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <p className="font-medium">{formatPrice(day.total_cents)}</p>
                    <p className="text-muted">{day.count} venda{day.count !== 1 ? "s" : ""}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[10px] text-muted" style={{ width: `${100 / 30}%` }}>
          <span className="block text-center">
            {dailySales[0]?.date.slice(8)}/{dailySales[0]?.date.slice(5, 7)}
          </span>
        </div>
      </div>

      {/* Recent sales table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Vendas recentes</h2>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-muted/20 mx-auto mb-4" />
            <p className="text-muted text-sm">
              Nenhuma venda ainda. Quando clientes comprarem suas fotos, voce vera aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sales.slice(0, 20).map((sale) => {
              const netCents = Math.round(sale.price_cents * 0.93);
              const feeCents = sale.price_cents - netCents;
              return (
                <div
                  key={sale.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{sale.event_title}</p>
                    <p className="text-xs text-muted">
                      {new Date(sale.created_at).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatPrice(netCents)}
                    </p>
                    <p className="text-[10px] text-muted">
                      -{formatPrice(feeCents)} taxa
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
