"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  CalendarDays,
  MapPin,
  ImageIcon,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  event_date: string | null;
  photo_count: number;
  cover_url: string | null;
}

const PAGE_SIZE = 12;

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadEvents();
  }, [page]);

  async function loadEvents() {
    setLoading(true);

    // Auto-activate scheduled events that have passed
    await supabase.rpc("activate_scheduled_events");

    const { data, count } = await supabase
      .from("events")
      .select(
        "id, title, description, location, city, state, event_date, photo_count, cover_url",
        { count: "exact" }
      )
      .eq("status", "active")
      .order("event_date", { ascending: false, nullsFirst: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setEvents(data || []);
    setTotal(count || 0);
    setLoading(false);
  }

  const filtered = search
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.location?.toLowerCase().includes(search.toLowerCase()) ||
          e.city?.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Page header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Eventos e <span className="gradient-text">galerias</span>
            </h1>
            <p className="text-muted text-lg max-w-xl mx-auto">
              Explore os eventos fotografados pelos nossos parceiros. Encontre
              suas fotos e leve a recordacao para casa.
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-lg mx-auto mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por evento, local ou cidade..."
              className="w-full bg-white/5 border border-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
            />
          </div>

          {/* Events grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <CalendarDays className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-muted text-lg mb-2">Nenhum evento encontrado.</p>
              <p className="text-muted text-sm">
                Tente buscar com outros termos ou volte mais tarde.
              </p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((event) => (
                  <Link
                    key={event.id}
                    href={`/eventos/${event.id}`}
                    className="group glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300"
                  >
                    {/* Cover */}
                    <div className="aspect-[16/9] bg-surface-light relative overflow-hidden">
                      {event.cover_url ? (
                        <img
                          src={event.cover_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-transparent">
                          <ImageIcon className="w-10 h-10 text-muted/20" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3 text-white" />
                        <span className="text-xs text-white font-medium">
                          {event.photo_count}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-5">
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <div className="space-y-1.5 text-xs text-muted">
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {event.location}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                          {(event.city || event.state) && (
                            <span className="flex items-center gap-1">
                              {!event.location && <MapPin className="w-3.5 h-3.5 shrink-0" />}
                              {event.city}{event.city && event.state && " - "}{event.state}
                            </span>
                          )}
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                              {new Date(
                                event.event_date + "T00:00:00"
                              ).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm glass hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                          i === page
                            ? "bg-primary text-white"
                            : "glass hover:bg-white/10 text-muted"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm glass hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Proximo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
