"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { CheckCircle, Download, ShoppingBag, Loader2 } from "lucide-react";

function SucessoContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const orderId = searchParams.get("order");
  const initialStatus = searchParams.get("status");
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const isPending = currentStatus === "pending";

  useEffect(() => {
    clearCart();
  }, []);

  const checkPayment = useCallback(async () => {
    if (!orderId) return null;
    try {
      const res = await fetch(`/api/check-payment?order_id=${orderId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.status as string;
    } catch {
      return null;
    }
  }, [orderId]);

  // Poll payment status when pending
  useEffect(() => {
    if (!isPending || !orderId) return;

    let attempts = 0;
    const maxAttempts = 20; // ~60 seconds
    const interval = setInterval(async () => {
      attempts++;
      const status = await checkPayment();
      if (status && status !== "pending") {
        setCurrentStatus(status);
        clearInterval(interval);
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPending, orderId, checkPayment]);

  async function handleManualCheck() {
    setChecking(true);
    const status = await checkPayment();
    if (status) setCurrentStatus(status);
    setChecking(false);
  }

  return (
    <div className="glass rounded-3xl p-10">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
        {isPending ? (
          <ShoppingBag className="w-10 h-10 text-yellow-400" />
        ) : (
          <CheckCircle className="w-10 h-10 text-primary" />
        )}
      </div>

      <h1 className="text-2xl font-bold mb-3">
        {isPending ? "Pagamento pendente" : "Compra realizada!"}
      </h1>

      <p className="text-muted mb-8">
        {isPending
          ? "Seu pagamento esta sendo processado. Assim que for confirmado, suas fotos estarao disponiveis para download."
          : "Suas fotos ja estao disponiveis para download sem marca d'agua. Aproveite!"}
      </p>

      {orderId && (
        <p className="text-xs text-muted mb-6">
          Pedido: {orderId.slice(0, 8)}...
        </p>
      )}

      {isPending && (
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-400 mb-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando pagamento automaticamente...
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isPending && (
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="flex items-center justify-center gap-2 glass hover:bg-white/10 py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {checking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando...
              </>
            ) : (
              "Ja paguei, verificar agora"
            )}
          </button>
        )}
        <Link
          href="/minhas-compras"
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-colors glow-green"
        >
          <Download className="w-5 h-5" />
          {isPending ? "Ver minhas compras" : "Baixar minhas fotos"}
        </Link>
        <Link
          href="/buscar"
          className="flex items-center justify-center gap-2 glass hover:bg-white/10 py-3.5 rounded-xl font-medium transition-colors"
        >
          Buscar mais fotos
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSucessoPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-6 text-center">
          <Suspense
            fallback={
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            }
          >
            <SucessoContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
