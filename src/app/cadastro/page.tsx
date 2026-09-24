"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, User, CameraIcon, CheckCircle, Phone, Info } from "lucide-react";

type Role = "client" | "photographer";

export default function CadastroPage() {
  const [role, setRole] = useState<Role>("client");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptFacial, setAcceptFacial] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          ...(role === "photographer" && phone ? { phone } : {}),
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative glass rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Conta criada!</h1>
          <p className="text-muted mb-8">
            Enviamos um email de confirmacao para <strong className="text-foreground">{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-medium transition-colors"
          >
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-10">
          <img
            src="/logo-fotonatrip.png"
            alt="fotonatrip"
            className="h-12 w-auto"
          />
        </Link>

        <div className="glass rounded-3xl p-8">
          <h1 className="text-2xl font-bold mb-2">Criar conta</h1>
          <p className="text-muted text-sm mb-6">
            Escolha como voce quer usar a plataforma.
          </p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                role === "client"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-white/5 text-muted hover:border-muted"
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Cliente</span>
              <span className="text-xs text-muted">Comprar fotos</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("photographer")}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                role === "photographer"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-white/5 text-muted hover:border-muted"
              }`}
            >
              <CameraIcon className="w-6 h-6" />
              <span className="text-sm font-medium">Fotografo</span>
              <span className="text-xs text-muted">Vender fotos</span>
            </button>
          </div>

          {role === "photographer" && (
            <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted">
                Os eventos e fotos sao mantidos por <strong className="text-foreground">3 meses</strong> apos a criacao.
                Depois desse periodo, fotos nao compradas sao removidas automaticamente para liberar espaco.
                Fotos ja compradas ficam disponiveis para sempre no cadastro do cliente.
              </p>
            </div>
          )}

          <button
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
                },
              });
            }}
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-border hover:bg-white/10 py-3 rounded-xl font-medium transition-colors text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Cadastrar com Google
          </button>
          <p className="text-[11px] text-muted text-center -mt-1">
            Ao continuar, voce aceita os{" "}
            <Link href="/termos" target="_blank" className="text-primary hover:text-primary-light transition-colors">Termos de Uso</Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="text-primary hover:text-primary-light transition-colors">Politica de Privacidade</Link>.
          </p>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="text-sm text-muted mb-2 block">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                required
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
              />
            </div>

            {role === "photographer" && (
              <div>
                <label className="text-sm text-muted mb-2 block flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-muted mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
              />
            </div>

            <div>
              <label className="text-sm text-muted mb-2 block">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  required
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* LGPD consent */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
                  required
                />
                <span className="text-xs text-muted leading-relaxed">
                  Li e aceito os{" "}
                  <Link href="/termos" target="_blank" className="text-primary hover:text-primary-light transition-colors">
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link href="/privacidade" target="_blank" className="text-primary hover:text-primary-light transition-colors">
                    Politica de Privacidade
                  </Link>.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptFacial}
                  onChange={(e) => setAcceptFacial(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
                  required
                />
                <span className="text-xs text-muted leading-relaxed">
                  Autorizo o uso de reconhecimento facial para busca de fotos, conforme a{" "}
                  <Link href="/privacidade" target="_blank" className="text-primary hover:text-primary-light transition-colors">
                    Politica de Privacidade
                  </Link>.
                </span>
              </label>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !acceptTerms || !acceptFacial}
              className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Criar conta"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Ja tem conta?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-light transition-colors font-medium"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
