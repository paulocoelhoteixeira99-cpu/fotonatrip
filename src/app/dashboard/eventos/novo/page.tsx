"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NovoEventoPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Voce precisa estar logado.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("events").insert({
      photographer_id: user.id,
      title,
      description: description || null,
      location: location || null,
      city: city || null,
      state: state || null,
      event_date: eventDate || null,
    });

    if (error) {
      setError("Erro ao criar evento. Tente novamente.");
      setLoading(false);
      return;
    }

    router.push("/dashboard/eventos");
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/eventos"
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para eventos
      </Link>

      <h1 className="text-2xl font-bold mb-2">Novo evento</h1>
      <p className="text-muted text-sm mb-8">
        Preencha as informacoes do evento para comecar a enviar fotos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-sm text-muted mb-2 block">
            Nome do evento *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Reveillon Copacabana 2026"
            required
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
          />
        </div>

        <div>
          <label className="text-sm text-muted mb-2 block">Descricao</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o evento..."
            rows={3}
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50 resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-muted mb-2 block">Local</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: Praia de Copacabana"
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted mb-2 block">Cidade</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Rio de Janeiro"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
            />
          </div>
          <div>
            <label className="text-sm text-muted mb-2 block">Estado</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Ex: RJ"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-muted mb-2 block">
            Data do evento
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Criar evento"
          )}
        </button>
      </form>
    </div>
  );
}
