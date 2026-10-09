"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  MapPin,
  CalendarDays,
  Users,
  CheckCircle,
  AlertCircle,
  KeyRound,
  DollarSign,
} from "lucide-react";

interface EventInfo {
  id: string;
  title: string;
  location: string | null;
  city: string | null;
  state: string | null;
  event_date: string | null;
  collaborator_commission_pct: number;
  price_per_photo_cents: number;
  photographer_id: string;
  owner_name: string | null;
}

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [error, setError] = useState("");
  const [isPhotographer, setIsPhotographer] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [alreadyCollaborator, setAlreadyCollaborator] = useState(false);
  const [hasPixKey, setHasPixKey] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch event by invite_code
      const { data: eventData } = await supabase
        .from("events")
        .select("id, title, location, city, state, event_date, collaborator_commission_pct, price_per_photo_cents, photographer_id, is_shared")
        .eq("invite_code", token)
        .eq("is_shared", true)
        .single();

      if (!eventData) {
        setError("Convite invalido ou expirado.");
        setLoading(false);
        return;
      }

      // Get owner name
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", eventData.photographer_id)
        .single();

      setEvent({
        ...eventData,
        owner_name: ownerProfile?.full_name || null,
      });

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      // Check if user is photographer
      const { data: photographer } = await supabase
        .from("photographers")
        .select("id, pix_key, pix_key_type")
        .eq("id", user.id)
        .single();

      if (!photographer) {
        setIsPhotographer(false);
        setLoading(false);
        return;
      }

      setIsPhotographer(true);
      setHasPixKey(!!photographer.pix_key && !!photographer.pix_key_type);

      // Check if is owner
      if (user.id === eventData.photographer_id) {
        setIsOwner(true);
        setLoading(false);
        return;
      }

      // Check if already a collaborator
      const { data: existing } = await supabase
        .from("event_collaborators")
        .select("id")
        .eq("event_id", eventData.id)
        .eq("photographer_id", user.id)
        .single();

      if (existing) {
        setAlreadyCollaborator(true);
      }

      setLoading(false);
    }

    load();
  }, [token]);

  async function handleAccept() {
    if (!event) return;
    setAccepting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: insertError } = await supabase
        .from("event_collaborators")
        .insert({
          event_id: event.id,
          photographer_id: user.id,
          commission_pct_snapshot: event.collaborator_commission_pct,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          setAlreadyCollaborator(true);
        } else {
          setError("Erro ao aceitar convite. Tente novamente.");
        }
        setAccepting(false);
        return;
      }

      setAccepted(true);
      setTimeout(() => {
        router.push(`/dashboard/eventos/${event.id}`);
      }, 2000);
    } catch {
      setError("Erro ao aceitar convite. Tente novamente.");
      setAccepting(false);
    }
  }

  function formatPrice(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-red-400/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Convite invalido</h1>
          <p className="text-sm text-muted mb-6">
            Este link de convite nao existe ou foi invalidado pelo dono do evento.
          </p>
          <Link
            href="/"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Voltar ao inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const commissionPct = event.collaborator_commission_pct;
  const photographerPct = 93 - commissionPct;
  const pricePerPhoto = event.price_per_photo_cents;
  const photographerReceives = Math.round(pricePerPhoto * photographerPct / 100);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="glass rounded-2xl p-8 max-w-lg w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Convite para evento</h1>
            <p className="text-sm text-muted">Voce foi convidado para colaborar</p>
          </div>
        </div>

        {/* Event info */}
        <div className="bg-white/5 rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-lg">{event.title}</h2>
          {event.owner_name && (
            <p className="text-sm text-muted">Organizado por <span className="text-foreground">{event.owner_name}</span></p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            {(event.location || event.city) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {event.location}{event.city && `, ${event.city}`}{event.state && ` - ${event.state}`}
              </span>
            )}
            {event.event_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {new Date(event.event_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>

        {/* Financial breakdown */}
        <div className="bg-white/5 rounded-xl p-5 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="w-4 h-4 text-primary" />
            Condicoes financeiras
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Preco por foto</span>
              <span>{formatPrice(pricePerPhoto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Taxa plataforma</span>
              <span className="text-red-400">-7%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Comissao do anfitriao</span>
              <span className="text-red-400">-{commissionPct}%</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-medium">
              <span>Voce recebe por foto</span>
              <span className="text-primary">{formatPrice(photographerReceives)}</span>
            </div>
          </div>
          <p className="text-xs text-muted">
            Repasses semanais via Pix (toda segunda-feira, minimo R$10,00).
          </p>
        </div>

        {/* Action area */}
        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {accepted ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="font-medium mb-1">Convite aceito!</p>
            <p className="text-sm text-muted">Redirecionando para o evento...</p>
          </div>
        ) : !isLoggedIn ? (
          <div className="text-center">
            <p className="text-sm text-muted mb-4">
              Faca login para aceitar o convite.
            </p>
            <Link
              href={`/login?next=/convite/${token}`}
              className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Fazer login
            </Link>
          </div>
        ) : !isPhotographer ? (
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <p className="text-sm text-muted">
              Apenas fotografos podem participar de eventos compartilhados.
              Sua conta precisa ser do tipo fotografo.
            </p>
          </div>
        ) : isOwner ? (
          <div className="text-center py-2">
            <p className="text-sm text-muted">
              Voce e o dono deste evento. Gerencie-o no{" "}
              <Link href={`/dashboard/eventos/${event.id}`} className="text-primary hover:underline">
                dashboard
              </Link>.
            </p>
          </div>
        ) : alreadyCollaborator ? (
          <div className="text-center py-2">
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted mb-3">Voce ja participa deste evento.</p>
            <Link
              href={`/dashboard/eventos/${event.id}`}
              className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Ir para o evento
            </Link>
          </div>
        ) : !hasPixKey ? (
          <div className="text-center">
            <KeyRound className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <p className="text-sm text-muted mb-4">
              Para participar de eventos compartilhados, voce precisa cadastrar sua chave Pix.
            </p>
            <Link
              href={`/dashboard/configuracoes?next=/convite/${token}`}
              className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Cadastrar chave Pix
            </Link>
          </div>
        ) : (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Aceitando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Aceitar e participar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
