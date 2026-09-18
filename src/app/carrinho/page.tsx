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
  const { items, removeItem, totalCents, count, clearCart, hydrated } = useCart();
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

  // MP fees are shown at checkout by Mercado Pago itself
  // Platform 7% is internal (deducted from photographer via split)

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

      if (data.init_point) {
        // Marketplace: redirect to Mercado Pago Checkout Pro
        window.location.href = data.init_point;
        return;
      }

      // Non-marketplace: redirect to embedded checkout page
      router.push(
        `/checkout?preference_id=${data.preference_id}&order_id=${data.order_id}&amount=${data.amount}`
      );
    } catch {
      setError("Erro de conexao. Tente novamente.");
      setLoading(false);
    }
  }

  // Loading spinner while hydrating from localStorage
  if (!hydrated) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link
            href="/eventos"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuar comprando
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
            <ShoppingCart className="w-6 sm:w-7 h-6 sm:h-7 text-primary" />
            Carrinho
          </h1>
          <p className="text-muted mb-8 sm:mb-10">
            {count > 0
              ? `${count} foto${count !== 1 ? "s" : ""} selecionada${count !== 1 ? "s" : ""}`
              : "Seu carrinho esta vazio"}
          </p>

          {count === 0 ? (
            <div className="glass rounded-3xl p-10 sm:p-16 text-center">
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
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Order summary - shows FIRST on mobile, sidebar on desktop */}
              <div className="lg:order-2 lg:w-80">
                <div className="glass rounded-2xl p-5 sm:p-6 lg:sticky lg:top-28">
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
                    <p className="text-[10px] text-muted">
                      Taxas do meio de pagamento podem ser aplicadas no checkout.
                    </p>
                  </div>

                  {error && (
                    <div className="text-sm text-red-400 bg-red-400/10 rounded-xl p-3 mb-4">
                      {error}
                    </div>
                  )}

                  {/* Desktop checkout button */}
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="hidden lg:flex w-full items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50 glow-green"
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

                  <p className="hidden lg:block text-[10px] text-muted text-center mt-3">
                    Pagamento seguro via Mercado Pago
                  </p>
                </div>
              </div>

              {/* Items list */}
              <div className="flex-1 space-y-4 sm:space-y-6 lg:order-1">
                {Object.entries(grouped).map(([eventId, group]) => (
                  <div key={eventId} className="glass rounded-2xl overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-border">
                      <p className="text-sm font-medium">{group.event_title}</p>
                      <p className="text-xs text-muted">por {group.photographer_name}</p>
                    </div>
                    <div className="divide-y divide-border">
                      {group.items.map((item) => (
                        <div
                          key={item.photo_id}
                          className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4"
                        >
                          <div className="w-12 h-15 sm:w-16 sm:h-20 rounded-lg overflow-hidden bg-surface-light flex-shrink-0">
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
                            className="p-2 text-muted hover:text-red-400 transition-colors flex-shrink-0"
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
            </div>
          )}
        </div>

        {/* Fixed bottom checkout button on mobile */}
        {count > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-3 lg:hidden">
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-2xl font-medium transition-colors disabled:opacity-50 shadow-lg shadow-primary/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Finalizar compra - {formatPrice(totalCents)}
                </>
              )}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
