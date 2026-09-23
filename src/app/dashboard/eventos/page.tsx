"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus, CalendarDays, Search, CalendarClock } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  photo_count: number;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadEvents() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("photographer_id", user.id)
        .order("created_at", { ascending: false });

      setEvents(data || []);
      setLoading(false);
    }

    loadEvents();
  }, []);

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Ativo", className: "bg-primary/10 text-primary" },
    inactive: { label: "Inativo", className: "bg-muted/10 text-muted" },
    scheduled: { label: "Agendado", className: "bg-yellow-500/10 text-yellow-400" },
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-muted text-sm mt-1">
            Gerencie seus eventos e galerias de fotos.
          </p>
        </div>
        <Link
          href="/dashboard/eventos/novo"
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Novo evento
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar eventos..."
          className="w-full bg-white/5 border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl text-center py-16">
          <CalendarDays className="w-12 h-12 text-muted/30 mx-auto mb-4" />
          <p className="text-muted mb-1">
            {search ? "Nenhum evento encontrado." : "Nenhum evento criado ainda."}
          </p>
          {!search && (
            <p className="text-muted text-sm mb-6">
              Crie seu primeiro evento para comecar a enviar fotos.
            </p>
          )}
          {!search && (
            <Link
              href="/dashboard/eventos/novo"
              className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Criar evento
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => {
            const cfg = statusConfig[event.status] || statusConfig.inactive;
            return (
              <Link
                key={event.id}
                href={`/dashboard/eventos/${event.id}`}
                className="glass rounded-2xl p-6 hover:bg-white/5 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${cfg.className}`}>
                    {cfg.label}
                  </span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
                {event.location && (
                  <p className="text-xs text-muted mb-3">{event.location}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>
                    {event.event_date
                      ? new Date(event.event_date + "T00:00:00").toLocaleDateString("pt-BR")
                      : "Sem data"}
                  </span>
                  <span>{event.photo_count} fotos</span>
                </div>
                {event.status === "scheduled" && event.scheduled_at && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Ativa em {new Date(event.scheduled_at).toLocaleDateString("pt-BR", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
