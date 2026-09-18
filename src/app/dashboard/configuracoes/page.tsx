"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, Link2, Unlink, CheckCircle, AlertCircle } from "lucide-react";

export default function ConfiguracoesPage() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [mpConnected, setMpConnected] = useState(false);
  const [mpUserId, setMpUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Show MP OAuth result message
    const mpStatus = searchParams.get("mp");
    if (mpStatus === "success") {
      setMessage("Mercado Pago conectado com sucesso!");
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/configuracoes");
    } else if (mpStatus === "error") {
      setMessage("Erro ao conectar Mercado Pago. Tente novamente.");
      window.history.replaceState({}, "", "/dashboard/configuracoes");
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, photographerRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("photographers").select("*").eq("id", user.id).single(),
      ]);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name || "");
      }
      if (photographerRes.data) {
        setBusinessName(photographerRes.data.business_name || "");
        setBio(photographerRes.data.bio || "");
        setPhone(photographerRes.data.phone || "");
        setCity(photographerRes.data.city || "");
        setState(photographerRes.data.state || "");
        setMpConnected(!!photographerRes.data.mp_user_id);
        setMpUserId(photographerRes.data.mp_user_id || null);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await Promise.all([
      supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", user.id),
      supabase
        .from("photographers")
        .update({
          business_name: businessName || null,
          bio: bio || null,
          phone: phone || null,
          city: city || null,
          state: state || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id),
    ]);

    setMessage("Configuracoes salvas com sucesso!");
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleDisconnectMP() {
    if (!confirm("Tem certeza que deseja desconectar sua conta do Mercado Pago?")) return;
    setDisconnecting(true);

    try {
      const res = await fetch("/api/mp/disconnect", { method: "POST" });
      if (res.ok) {
        setMpConnected(false);
        setMpUserId(null);
        setMessage("Mercado Pago desconectado.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("Erro ao desconectar. Tente novamente.");
    }

    setDisconnecting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Configuracoes</h1>
      <p className="text-muted text-sm mb-8">
        Atualize suas informacoes pessoais e profissionais.
      </p>

      {message && (
        <div
          className={`text-sm rounded-xl px-4 py-3 mb-6 flex items-center gap-2 ${
            message.includes("Erro")
              ? "text-red-400 bg-red-400/10"
              : "text-primary bg-primary/10"
          }`}
        >
          {message.includes("Erro") ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message}
        </div>
      )}

      {/* Mercado Pago Section */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wider mb-5">
          Mercado Pago
        </h2>

        {mpConnected ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Conta conectada</p>
                <p className="text-xs text-muted">ID: {mpUserId}</p>
              </div>
            </div>
            <p className="text-xs text-muted mb-2">
              Seus pagamentos serao recebidos diretamente na sua conta do Mercado
              Pago, com 7% de comissao da plataforma retida automaticamente.
            </p>
            <p className="text-xs text-yellow-400/80 bg-yellow-400/10 rounded-lg px-3 py-2 mb-4">
              Importante: para receber pagamentos via Pix, cadastre uma chave
              Pix na sua conta do Mercado Pago (app &gt; Pix &gt; Cadastrar chave).
            </p>
            <button
              onClick={handleDisconnectMP}
              disabled={disconnecting}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
              Desconectar
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted mb-3">
              Conecte sua conta do Mercado Pago para receber pagamentos
              diretamente. A plataforma retém apenas 7% de comissao.
            </p>
            <p className="text-xs text-yellow-400/80 bg-yellow-400/10 rounded-lg px-3 py-2 mb-4">
              Antes de conectar, certifique-se de ter uma chave Pix cadastrada
              no seu Mercado Pago (app &gt; Pix &gt; Cadastrar chave) para
              receber pagamentos via Pix.
            </p>
            <a
              href="/api/mp/connect"
              className="inline-flex items-center gap-2 bg-[#009ee3] hover:bg-[#0088c7] text-white px-6 py-3 rounded-xl font-medium transition-colors text-sm"
            >
              <Link2 className="w-4 h-4" />
              Conectar Mercado Pago
            </a>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wider">
            Informacoes pessoais
          </h2>

          <div>
            <label className="text-sm text-muted mb-2 block">
              Nome completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-muted mb-2 block">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
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
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-muted mb-2 block">Estado</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wider">
            Perfil profissional
          </h2>

          <div>
            <label className="text-sm text-muted mb-2 block">
              Nome do negocio / estudio
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Studio Foto Trip"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
            />
          </div>

          <div>
            <label className="text-sm text-muted mb-2 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre voce e seu trabalho..."
              rows={4}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar
        </button>
      </form>
    </div>
  );
}
