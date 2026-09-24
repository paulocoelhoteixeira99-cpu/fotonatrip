"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CalendarClock, DollarSign, Package } from "lucide-react";
import Link from "next/link";

const BRAZILIAN_STATES = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" }, { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" }, { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" }, { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" }, { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" }, { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
];

type EventStatus = "active" | "inactive" | "scheduled";

export default function NovoEventoPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [status, setStatus] = useState<EventStatus>("active");
  const [scheduledAt, setScheduledAt] = useState("");
  const [priceInput, setPriceInput] = useState("15,00");
  const [packagePriceInput, setPackagePriceInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function fetchCities(uf: string) {
    if (!uf) { setCities([]); return; }
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      const data = await res.json();
      setCities(data.map((m: { nome: string }) => m.nome));
    } catch {
      setCities([]);
    }
  }

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

    const priceCents = Math.round(parseFloat(priceInput.replace(",", ".")) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      setError("Informe um preco valido por foto.");
      setLoading(false);
      return;
    }

    const packageCents = packagePriceInput
      ? Math.round(parseFloat(packagePriceInput.replace(",", ".")) * 100)
      : null;

    if (packageCents !== null && (isNaN(packageCents) || packageCents <= 0)) {
      setError("Informe um preco valido para o pacote ou deixe em branco.");
      setLoading(false);
      return;
    }

    if (status === "scheduled" && !scheduledAt) {
      setError("Informe a data de ativacao para eventos agendados.");
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
      status,
      scheduled_at: status === "scheduled" ? new Date(scheduledAt).toISOString() : null,
      price_per_photo_cents: priceCents,
      package_price_cents: packageCents,
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
            <label className="text-sm text-muted mb-2 block">Estado</label>
            <select
              value={state}
              onChange={(e) => { setState(e.target.value); setCity(""); fetchCities(e.target.value); }}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
            >
              <option value="">Selecione</option>
              {BRAZILIAN_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>{s.uf} - {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted mb-2 block">Cidade</label>
            <input
              type="text"
              list="cities-list-novo"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={state ? "Digite para buscar..." : "Selecione o estado primeiro"}
              disabled={!state}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50 disabled:opacity-50"
            />
            <datalist id="cities-list-novo">
              {cities.map((c) => <option key={c} value={c} />)}
            </datalist>
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

        {/* Status */}
        <div>
          <label className="text-sm text-muted mb-2 block">
            Status do evento
          </label>
          <div className="flex gap-2">
            {(["active", "inactive", "scheduled"] as const).map((s) => {
              const labels = { active: "Ativo", inactive: "Inativo", scheduled: "Agendado" };
              const colors = {
                active: status === s ? "bg-primary text-white" : "glass hover:bg-white/10 text-muted",
                inactive: status === s ? "bg-muted/30 text-foreground" : "glass hover:bg-white/10 text-muted",
                scheduled: status === s ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "glass hover:bg-white/10 text-muted",
              };
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border border-transparent ${colors[s]}`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
          {status === "scheduled" && (
            <div className="mt-3">
              <label className="text-xs text-muted mb-1.5 block flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Data e hora de ativacao
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
              />
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Precos
          </h3>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Preco por foto *</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">R$</span>
              <input
                type="text"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="15,00"
                className="w-32 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Preco do pacote (todas as fotos reconhecidas)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">R$</span>
              <input
                type="text"
                value={packagePriceInput}
                onChange={(e) => setPackagePriceInput(e.target.value)}
                placeholder="Opcional"
                className="w-32 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-muted mt-1.5">
              Se preenchido, o cliente tera a opcao de comprar todas as suas fotos reconhecidas por este valor.
            </p>
          </div>
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
