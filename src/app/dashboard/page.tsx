"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageIcon, CalendarDays, TrendingUp, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import Link from "next/link";

interface Stats {
  totalPhotos: number;
  totalEvents: number;
  totalRevenueCents: number;
  totalSalesCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalPhotos: 0,
    totalEvents: 0,
    totalRevenueCents: 0,
    totalSalesCount: 0,
  });
  const [recentEvents, setRecentEvents] = useState<
    { id: string; title: string; event_date: string; photo_count: number; is_active: boolean }[]
  >([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [photosRes, eventsRes, salesRes] = await Promise.all([
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", user.id),
        supabase
          .from("events")
          .select("*")
          .eq("photographer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("order_items")
          .select("price_cents, orders!inner(status)")
          .eq("photographer_id", user.id)
          .eq("orders.status", "paid"),
      ]);

      const salesData = salesRes.data || [];
      const totalRevenueCents = salesData.reduce(
        (sum: number, item: any) => sum + Math.round(item.price_cents * 0.93),
        0
      );

      setStats({
        totalPhotos: photosRes.count || 0,
        totalEvents: eventsRes.data?.length || 0,
        totalRevenueCents,
        totalSalesCount: salesData.length,
      });

      setRecentEvents(eventsRes.data || []);
    }

    loadData();
  }, []);

  const statCards = [
    {
      label: "Fotos",
      value: String(stats.totalPhotos),
      icon: ImageIcon,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Eventos",
      value: String(stats.totalEvents),
      icon: CalendarDays,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Fotos vendidas",
      value: String(stats.totalSalesCount),
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Receita liquida",
      value: formatPrice(stats.totalRevenueCents),
      icon: DollarSign,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Visao geral da sua conta.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((stat) => (
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

      {/* Recent events */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Eventos recentes</h2>
          <Link
            href="/dashboard/eventos"
            className="text-sm text-primary hover:text-primary-light transition-colors"
          >
            Ver todos
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="w-10 h-10 text-muted/30 mx-auto mb-4" />
            <p className="text-muted text-sm mb-4">
              Voce ainda nao criou nenhum evento.
            </p>
            <Link
              href="/dashboard/eventos/novo"
              className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Criar primeiro evento
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/eventos/${event.id}`}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted">
                      {event.event_date
                        ? new Date(event.event_date + "T00:00:00").toLocaleDateString("pt-BR")
                        : "Sem data"}{" "}
                      · {event.photo_count} fotos
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    event.is_active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/10 text-muted"
                  }`}
                >
                  {event.is_active ? "Ativo" : "Inativo"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
