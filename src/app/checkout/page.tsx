"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useCart, formatPrice } from "@/lib/cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck, Loader2 } from "lucide-react";

initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!, {
  locale: "pt-BR",
});

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, clearCart } = useCart();
  const preferenceId = searchParams.get("preference_id");
  const orderId = searchParams.get("order_id");
  const amount = parseFloat(searchParams.get("amount") || "0");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If no preference, redirect to cart
  useEffect(() => {
    if (!preferenceId || !orderId) {
      router.replace("/carrinho");
    }
  }, [preferenceId, orderId, router]);

  if (!preferenceId || !orderId || amount === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6">
      <Link
        href="/carrinho"
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao carrinho
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Lock className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Pagamento</h1>
      </div>
      <p className="text-muted text-sm mb-8">
        {items.length} foto{items.length !== 1 ? "s" : ""} &middot;{" "}
        <span className="font-semibold text-foreground">
          {formatPrice(amount * 100)}
        </span>
      </p>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {processing && (
        <div className="flex items-center justify-center gap-3 py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted">Processando pagamento...</span>
        </div>
      )}

      <div className={processing ? "hidden" : ""}>
        <Payment
          initialization={{
            amount: amount,
            preferenceId: preferenceId,
          }}
          customization={{
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              mercadoPago: "all",
            },
            visual: {
              style: {
                theme: "dark",
              },
            },
          }}
          onSubmit={async ({ formData }) => {
            setProcessing(true);
            setError(null);

            try {
              const res = await fetch("/api/process-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ formData, orderId }),
              });

              const data = await res.json();

              if (!res.ok) {
                setError(data.error || "Erro ao processar pagamento");
                setProcessing(false);
                return;
              }

              if (data.status === "approved") {
                clearCart();
                router.push(`/checkout/sucesso?order=${orderId}`);
              } else if (data.status === "rejected") {
                setError(
                  "Pagamento recusado. Verifique os dados e tente novamente."
                );
                setProcessing(false);
              } else {
                // pending / in_process
                clearCart();
                router.push(
                  `/checkout/sucesso?order=${orderId}&status=pending`
                );
              }
            } catch {
              setError("Erro de conexao. Tente novamente.");
              setProcessing(false);
            }
          }}
          onReady={() => {}}
          onError={(error) => {
            console.error("Payment Brick error:", error);
          }}
        />
      </div>

      <div className="flex items-center justify-center gap-2 mt-8 text-xs text-muted">
        <ShieldCheck className="w-4 h-4" />
        Pagamento seguro processado pelo Mercado Pago
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
