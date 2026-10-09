"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, Link2, Unlink, CheckCircle, AlertCircle, KeyRound, Check } from "lucide-react";

export default function ConfiguracoesPage() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [mpConnected, setMpConnected] = useState(false);
  const [mpUserId, setMpUserId] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");
  const initialValues = useRef<Record<string, string>>({});
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Show MP OAuth result message
    const mpStatus = searchParams.get("mp");
    if (mpStatus === "success") {
      setMessage("Mercado Pago conectado com sucesso!");
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

      const values: Record<string, string> = {};

      if (profileRes.data) {
        const fn = profileRes.data.full_name || "";
        setFullName(fn);
        values.fullName = fn;
      }
      if (photographerRes.data) {
        const d = photographerRes.data;
        const bn = d.business_name || "";
        const b = d.bio || "";
        const p = d.phone || "";
        const c = d.city || "";
        const s = d.state || "";
        const pk = d.pix_key || "";
        const pkt = d.pix_key_type || "";
        setBusinessName(bn);
        setBio(b);
        setPhone(p);
        setCity(c);
        setState(s);
        setMpConnected(!!d.mp_user_id);
        setMpUserId(d.mp_user_id || null);
        setPixKey(pk);
        setPixKeyType(pkt);
        values.businessName = bn;
        values.bio = b;
        values.phone = p;
        values.city = c;
        values.state = s;
        values.pixKey = pk;
        values.pixKeyType = pkt;
      }

      initialValues.current = values;
      setLoading(false);
    }

    load();
  }, []);

  function markChanged() {
    setHasChanges(true);
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [profileResult, photographerResult] = await Promise.all([
      supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", user.id),
      supabase
        .from("photographers")
        .upsert({
          id: user.id,
          business_name: businessName || null,
          bio: bio || null,
          phone: phone || null,
          city: city || null,
          state: state || null,
          pix_key: pixKey || null,
          pix_key_type: pixKeyType || null,
          updated_at: new Date().toISOString(),
        }),
    ]);

    if (profileResult.error || photographerResult.error) {
      console.error("Profile save error:", profileResult.error);
      console.error("Photographer save error:", photographerResult.error);
      setMessage("Erro ao salvar. Verifique os dados e tente novamente.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setHasChanges(false);
    initialValues.current = {
      fullName, businessName, bio, phone, city, state, pixKey, pixKeyType,
    };

    // Redirect if ?next= is present (e.g. from invite flow)
    const next = searchParams.get("next");
    if (next && pixKey && pixKeyType) {
      setTimeout(() => {
        window.location.href = next;
      }, 1000);
    }
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
              onChange={(e) => { setFullName(e.target.value); markChanged(); }}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-muted mb-2 block">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); markChanged(); }}
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
                onChange={(e) => { setCity(e.target.value); markChanged(); }}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-muted mb-2 block">Estado</label>
              <input
                type="text"
                value={state}
                onChange={(e) => { setState(e.target.value); markChanged(); }}
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
              onChange={(e) => { setBusinessName(e.target.value); markChanged(); }}
              placeholder="Ex: Studio Foto Trip"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
            />
          </div>

          <div>
            <label className="text-sm text-muted mb-2 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => { setBio(e.target.value); markChanged(); }}
              placeholder="Conte um pouco sobre voce e seu trabalho..."
              rows={4}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50 resize-none"
            />
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Chave Pix
          </h2>

          <div>
            <label className="text-sm text-muted mb-2 block">Tipo da chave</label>
            <select
              value={pixKeyType}
              onChange={(e) => { setPixKeyType(e.target.value); markChanged(); }}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
            >
              <option value="">Selecione o tipo</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone</option>
              <option value="random">Chave aleatoria</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-muted mb-2 block">Chave Pix</label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => { setPixKey(e.target.value); markChanged(); }}
              placeholder={
                pixKeyType === "cpf" ? "000.000.000-00" :
                pixKeyType === "cnpj" ? "00.000.000/0000-00" :
                pixKeyType === "email" ? "seu@email.com" :
                pixKeyType === "phone" ? "(11) 99999-9999" :
                pixKeyType === "random" ? "Chave aleatoria do Pix" :
                "Selecione o tipo primeiro"
              }
              disabled={!pixKeyType}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50 disabled:opacity-50"
            />
          </div>

          <p className="text-xs text-muted">
            Sua chave Pix e utilizada para receber repasses de vendas em eventos compartilhados.
            Os repasses sao gerados semanalmente (toda segunda-feira) com valor minimo de R$10,00.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || (!hasChanges && !saving)}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all ${
            saved
              ? "bg-primary/15 text-primary border border-primary/30"
              : hasChanges
              ? "bg-primary hover:bg-primary-dark text-white"
              : "bg-white/5 text-muted cursor-default"
          } disabled:opacity-50`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Salvo
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar
            </>
          )}
        </button>
      </form>
    </div>
  );
}
