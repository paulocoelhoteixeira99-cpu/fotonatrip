"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save } from "lucide-react";

export default function ConfiguracoesPage() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

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

        {message && (
          <p className="text-primary text-sm bg-primary/10 rounded-xl px-4 py-3">
            {message}
          </p>
        )}

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
