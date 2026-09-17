"use client";

import { useState } from "react";
import { useCart, formatPrice } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  ImageIcon,
  ScanFace,
  Loader2,
  Lock,
} from "lucide-react";

export default function CarrinhoPage() {
  const { items, removeItem, totalCents, count, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Group items by event
  const grouped = items.reduce<
    Record<string, { event_title: string; photographer_name: string; items: typeof items }>
  >((acc, item) => {
    if (!acc[item.event_id]) {
      acc[item.event_id] = {
        event_title: item.event_title,
        photographer_name: item.photographer_name,
        items: [],
      };
    }
    acc[item.event_id].items.push(item);
    return acc;
  }, {});

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/carrinho");
      return;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            photo_id: i.photo_id,
            event_id: i.event_id,
            photographer_id: i.photographer_id,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar pagamento");
        setLoading(false);
        return;
      }

      // Redirect to Mercado Pago
      window.location.href = data.checkout_url;
    } catch {
      setError("Erro de conexao. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <Link
            href="/eventos"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuar comprando
          </Link>

          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-primary" />
            Carrinho
          </h1>
          <p className="text-muted mb-10">
            {count > 0
              ? `${count} foto${count !== 1 ? "s" : ""} selecionada${count !== 1 ? "s" : ""}`
              : "Seu carrinho esta vazio"}
          </p>

          {count === 0 ? (
            <div className="glass rounded-3xl p-16 text-center">
              <ImageIcon className="w-16 h-16 text-muted/20 mx-auto mb-6" />
              <p className="text-muted mb-6">
                Voce ainda nao adicionou nenhuma foto ao carrinho.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/buscar"
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  <ScanFace className="w-5 h-5" />
                  Buscar minhas fotos
                </Link>
                <Link
                  href="/eventos"
                  className="flex items-center justify-center gap-2 glass hover:bg-white/10 px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                  Ver eventos
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Items list */}
              <div className="flex-1 space-y-6">
                {Object.entries(grouped).map(([eventId, group]) => (
                  <div key={eventId} className="glass rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-border">
                      <p className="text-sm font-medium">{group.event_title}</p>
                      <p className="text-xs text-muted">por {group.photographer_name}</p>
                    </div>
                    <div className="divide-y divide-border">
                      {group.items.map((item) => (
                        <div
                          key={item.photo_id}
                          className="flex items-center gap-4 p-4"
                        >
                          <div className="w-16 h-20 rounded-lg overflow-hidden bg-surface-light flex-shrink-0">
                            <img
                              src={item.watermark_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.event_title}</p>
                            <p className="text-xs text-muted">Foto com marca d&apos;agua</p>
                          </div>
                          <span className="text-sm font-semibold whitespace-nowrap">
                            {formatPrice(item.price_cents)}
                          </span>
                          <button
                            onClick={() => removeItem(item.photo_id)}
                            className="p-2 text-muted hover:text-red-400 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={clearCart}
                  className="text-sm text-muted hover:text-red-400 transition-colors"
                >
                  Limpar carrinho
                </button>
              </div>

              {/* Order summary */}
              <div className="lg:w-80">
                <div className="glass rounded-2xl p-6 lg:sticky lg:top-28">
                  <h2 className="font-semibold mb-4">Resumo do pedido</h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">
                        {count} foto{count !== 1 ? "s" : ""}
                      </span>
                      <span>{formatPrice(totalCents)}</span>
                    </div>
                    <hr className="border-border" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-lg gradient-text">
                        {formatPrice(totalCents)}
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-400 bg-red-400/10 rounded-xl p-3 mb-4">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50 glow-green"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Finalizar compra
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-muted text-center mt-3">
                    Pagamento seguro via Mercado Pago
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
