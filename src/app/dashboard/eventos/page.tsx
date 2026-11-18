"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus, CalendarDays, Search, CalendarClock, Users, Link2, Check, QrCode, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

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
  is_shared?: boolean;
  is_collaborator?: boolean;
  owner_name?: string;
}

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadEvents() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Own events
      const { data: ownEvents } = await supabase
        .from("events")
        .select("*")
        .eq("photographer_id", user.id)
        .order("created_at", { ascending: false });

      // Events where user is a collaborator
      const { data: collabRecords } = await supabase
        .from("event_collaborators")
        .select("event_id")
        .eq("photographer_id", user.id);

      let collabEvents: Event[] = [];
      if (collabRecords && collabRecords.length > 0) {
        const collabEventIds = collabRecords.map((c) => c.event_id);
        const { data: events } = await supabase
          .from("events")
          .select("*")
          .in("id", collabEventIds)
          .order("created_at", { ascending: false });

        if (events && events.length > 0) {
          // Get owner names
          const ownerIds = [...new Set(events.map((e) => e.photographer_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ownerIds);
          const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));

          collabEvents = events.map((e) => ({
            ...e,
            is_collaborator: true,
            owner_name: profileMap.get(e.photographer_id) || undefined,
          }));
        }
      }

      setEvents([...(ownEvents || []), ...collabEvents]);
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

      {/* Share all events link & QR Code */}
      {userId && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <Link2 className="w-4 h-4 text-primary" />
            Compartilhar seus eventos
          </div>
          <p className="text-xs text-muted mb-3">Link direto para a página com todos os seus eventos. Ideal para cartões físicos.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : "https://www.fotonatrip.com.br"}/eventos?fotografo=${userId}`}
              className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-muted focus:outline-none select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => {
                const url = `${window.location.origin}/eventos?fotografo=${userId}`;
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 text-sm bg-primary/15 hover:bg-primary/25 text-primary px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              {copied ? (<><Check className="w-4 h-4" />Copiado!</>) : (<><Link2 className="w-4 h-4" />Copiar link</>)}
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${showQR ? "bg-primary/10 text-primary" : "bg-white/10 hover:bg-white/15"}`}
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
          </div>
          {showQR && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="bg-white p-4 rounded-xl" id="qr-all-events">
                <QRCodeCanvas
                  value={`${typeof window !== "undefined" ? window.location.origin : "https://www.fotonatrip.com.br"}/eventos?fotografo=${userId}`}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <button
                onClick={async () => {
                  const canvas = document.querySelector("#qr-all-events canvas") as HTMLCanvasElement;
                  if (!canvas) return;

                  const margin = 48;
                  const padded = document.createElement("canvas");
                  padded.width = canvas.width + margin * 2;
                  padded.height = canvas.height + margin * 2;
                  const ctx = padded.getContext("2d");
                  if (!ctx) return;
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, padded.width, padded.height);
                  ctx.drawImage(canvas, margin, margin);

                  const fileName = "qrcode-meus-eventos.png";

                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  if (isIOS && navigator.share) {
                    try {
                      const blob = await new Promise<Blob>((resolve) =>
                        padded.toBlob((b) => resolve(b!), "image/png")
                      );
                      const file = new File([blob], fileName, { type: "image/png" });
                      await navigator.share({ files: [file] });
                      return;
                    } catch {
                      return;
                    }
                  }

                  const link = document.createElement("a");
                  link.download = fileName;
                  link.href = padded.toDataURL("image/png");
                  link.click();
                }}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-light transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar QR Code
              </button>
              <p className="text-xs text-muted text-center">
                Imprima o QR Code em cartões físicos para seus clientes acessarem todos os seus eventos.
              </p>
            </div>
          )}
        </div>
      )}

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
                {event.is_collaborator && (
                  <p className="text-xs text-primary flex items-center gap-1 mb-1">
                    <Users className="w-3 h-3" />
                    Colaborador{event.owner_name && ` — ${event.owner_name}`}
                  </p>
                )}
                {event.is_shared && !event.is_collaborator && (
                  <p className="text-xs text-muted flex items-center gap-1 mb-1">
                    <Users className="w-3 h-3" />
                    Evento compartilhado
                  </p>
                )}
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
