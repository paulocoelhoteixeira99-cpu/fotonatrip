"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Package,
  Tag,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";

export default function CarrinhoPage() {
  const { items, removeItem, totalCents, count, photoCount, clearCart, hydrated } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    coupon_id: string;
    discount_cents: number;
    label: string;
  } | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const supabase = createClient();
  const router = useRouter();

  // Flat list of photo items (no packages) for lightbox navigation
  const photoItems = items.filter((i) => !i.is_package);

  const navigatePreview = useCallback((direction: "prev" | "next") => {
    setPreviewIdx((cur) => {
      if (cur === null) return null;
      if (direction === "next") return cur < photoItems.length - 1 ? cur + 1 : cur;
      return cur > 0 ? cur - 1 : cur;
    });
  }, [photoItems.length]);

  useEffect(() => {
    if (previewIdx === null) return;
    window.history.pushState({ cartPreview: true }, "");
    const onPop = () => setPreviewIdx(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.history.back();
      if (e.key === "ArrowRight") navigatePreview("next");
      if (e.key === "ArrowLeft") navigatePreview("prev");
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, [previewIdx, navigatePreview]);

  const discountCents = appliedCoupon?.discount_cents || 0;
  const finalTotalCents = totalCents - discountCents;

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), total_cents: totalCents }),
      });
      const data = await res.json();

      if (data.valid) {
        setAppliedCoupon({
          code: data.code,
          coupon_id: data.coupon_id,
          discount_cents: data.discount_cents,
          label: data.label,
        });
        setCouponError(null);
      } else {
        setCouponError(data.message || "Cupom inválido");
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError("Erro ao validar cupom");
    }
    setCouponLoading(false);
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

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
          items: items.filter((i) => !i.is_package).map((i) => ({
            photo_id: i.photo_id,
            event_id: i.event_id,
            photographer_id: i.photographer_id,
          })),
          packages: items.filter((i) => i.is_package).map((i) => ({
            event_id: i.event_id,
            photo_ids: i.package_photo_ids || [],
            photographer_id: i.photographer_id,
          })),
          coupon_code: appliedCoupon?.code || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar pagamento");
        setLoading(false);
        return;
      }

      // 100% discount — order already marked as paid, go straight to success
      if (data.free) {
        clearCart();
        router.push(`/checkout/sucesso?order=${data.order_id}`);
        return;
      }

      // Redirect to embedded checkout page
      const params = new URLSearchParams({
        preference_id: data.preference_id,
        order_id: data.order_id,
        amount: String(data.amount),
      });
      if (data.init_point) {
        params.set("init_point", data.init_point);
      }
      router.push(`/checkout?${params.toString()}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
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
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuar comprando
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
            <ShoppingCart className="w-6 sm:w-7 h-6 sm:h-7 text-primary" />
            Carrinho
          </h1>
          <p className="text-muted mb-8 sm:mb-10">
            {count > 0
              ? `${photoCount} foto${photoCount !== 1 ? "s" : ""} selecionada${photoCount !== 1 ? "s" : ""}`
              : "Seu carrinho está vazio"}
          </p>

          {count === 0 ? (
            <div className="glass rounded-3xl p-10 sm:p-16 text-center">
              <ImageIcon className="w-16 h-16 text-muted/20 mx-auto mb-6" />
              <p className="text-muted mb-6">
                Você ainda não adicionou nenhuma foto ao carrinho.
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
                        {photoCount} foto{photoCount !== 1 ? "s" : ""}
                      </span>
                      <span>{formatPrice(totalCents)}</span>
                    </div>

                    {/* Coupon */}
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between text-sm bg-primary/10 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-primary" />
                          <span className="text-primary font-medium">{appliedCoupon.code}</span>
                          <span className="text-xs text-muted">({appliedCoupon.label})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-medium">-{formatPrice(discountCents)}</span>
                          <button onClick={handleRemoveCoupon} className="text-muted hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-stretch gap-2">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                            placeholder="Cupom de desconto"
                            className="flex-1 min-w-0 bg-white/5 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary placeholder:text-muted/50"
                          />
                          <button
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponInput.trim()}
                            className="px-4 bg-white/10 hover:bg-white/15 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                          >
                            {couponLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Aplicar"
                            )}
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-xs text-red-400 mt-1.5">{couponError}</p>
                        )}
                      </div>
                    )}

                    <hr className="border-border" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <div className="text-right">
                        {discountCents > 0 && (
                          <span className="text-xs text-muted line-through block">
                            {formatPrice(totalCents)}
                          </span>
                        )}
                        <span className="text-lg gradient-text">
                          {formatPrice(finalTotalCents)}
                        </span>
                      </div>
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
                          <div
                            className={`rounded-lg overflow-hidden bg-surface-light flex-shrink-0 relative group/thumb ${
                              item.is_package ? "w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-primary/10" : "w-12 h-15 sm:w-16 sm:h-20 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (!item.is_package) {
                                const idx = photoItems.findIndex((p) => p.photo_id === item.photo_id);
                                if (idx >= 0) setPreviewIdx(idx);
                              }
                            }}
                          >
                            {item.is_package ? (
                              <Package className="w-6 h-6 text-primary" />
                            ) : (
                              <>
                                <img src={item.watermark_url} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn className="w-4 h-4 text-white" />
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                              {item.is_package
                                ? `Pacote - ${item.package_photo_count} fotos`
                                : item.event_title}
                            </p>
                            <p className="text-xs text-muted">
                              {item.is_package
                                ? "Todas as fotos reconhecidas"
                                : "Foto em alta resolução"}
                            </p>
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
                  Finalizar compra - {formatPrice(finalTotalCents)}
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Photo preview lightbox */}
      {previewIdx !== null && photoItems[previewIdx] && (() => {
        const item = photoItems[previewIdx];
        const hasPrev = previewIdx > 0;
        const hasNext = previewIdx < photoItems.length - 1;
        return (
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => window.history.back()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); window.history.back(); }}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {hasPrev && (
              <button
                onClick={(e) => { e.stopPropagation(); navigatePreview("prev"); }}
                className="absolute left-2 md:left-4 top-[38%] -translate-y-1/2 p-2 md:p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {hasNext && (
              <button
                onClick={(e) => { e.stopPropagation(); navigatePreview("next"); }}
                className="absolute right-2 md:right-4 top-[38%] -translate-y-1/2 p-2 md:p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            <div
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                const dy = e.changedTouches[0].clientY - touchStartY.current;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                  if (dx < 0) navigatePreview("next");
                  else navigatePreview("prev");
                }
              }}
            >
              <img
                src={item.watermark_url}
                alt=""
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
              <div className="mt-2 flex items-center justify-between glass rounded-xl p-3">
                <div>
                  <p className="text-xs text-muted">{item.event_title}</p>
                  <p className="text-sm font-semibold">{formatPrice(item.price_cents)}</p>
                </div>
                <span className="flex items-center gap-1.5 text-sm text-primary bg-primary/10 px-4 py-2 rounded-xl">
                  <Check className="w-4 h-4" />
                  No carrinho
                </span>
              </div>
              <p className="text-xs text-muted text-center mt-2">
                {previewIdx + 1} de {photoItems.length}
              </p>
            </div>
          </div>
        );
      })()}

      <Footer />
    </>
  );
}
