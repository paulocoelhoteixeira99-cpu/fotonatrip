"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useCart, formatPrice } from "@/lib/cart";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck, Loader2, Copy, Check } from "lucide-react";

// Init only in the browser (this file is loaded with ssr: false)
initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!, {
  locale: "pt-BR",
});

interface PixData {
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

export default function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, clearCart } = useCart();
  const preferenceId = searchParams.get("preference_id");
  const orderId = searchParams.get("order_id");
  const amount = parseFloat(searchParams.get("amount") || "0");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brickReady, setBrickReady] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);

  // If no preference, redirect to cart
  useEffect(() => {
    if (!preferenceId || !orderId) {
      router.replace("/carrinho");
    }
  }, [preferenceId, orderId, router]);

  async function copyPixCode() {
    if (!pixData?.qr_code) return;
    await navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  if (!preferenceId || !orderId || amount === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Pix QR Code screen
  if (pixData) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
        <div className="glass rounded-2xl p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Pague com Pix</h2>
          <p className="text-muted text-sm mb-6">
            Escaneie o QR Code ou copie o codigo para pagar{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(amount * 100)}
            </span>
          </p>

          {pixData.qr_code_base64 && (
            <div className="bg-white rounded-xl p-4 inline-block mb-6">
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code Pix"
                className="w-48 h-48"
              />
            </div>
          )}

          {pixData.qr_code && (
            <div className="mb-6">
              <div className="bg-white/5 border border-border rounded-xl p-3 mb-3">
                <p className="text-xs text-muted break-all font-mono leading-relaxed">
                  {pixData.qr_code}
                </p>
              </div>
              <button
                onClick={copyPixCode}
                className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar codigo Pix
                  </>
                )}
              </button>
            </div>
          )}

          <p className="text-xs text-muted mb-4">
            Apos o pagamento, suas fotos serao liberadas automaticamente.
          </p>

          <Link
            href={`/checkout/sucesso?order=${orderId}&status=pending`}
            onClick={() => clearCart()}
            className="text-sm text-primary hover:text-primary-dark transition-colors"
          >
            Ja paguei
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted">
          <ShieldCheck className="w-4 h-4" />
          Pagamento seguro processado pelo Mercado Pago
        </div>
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

      {!brickReady && !processing && (
        <div className="flex items-center justify-center gap-3 py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
          <span className="text-sm text-muted">Carregando formulario de pagamento...</span>
        </div>
      )}

      <div className={processing ? "hidden" : ""}>
        <Payment
          initialization={{
            amount: amount,
          }}
          customization={{
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              bankTransfer: "all",
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
              } else if (data.pix) {
                // Pix: show QR code
                setPixData(data.pix);
                setProcessing(false);
              } else {
                // Other pending payments
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
          onReady={() => {
            setBrickReady(true);
            setError(null);
          }}
          onError={(error) => {
            console.error("Payment Brick error:", error);
            if (!brickReady) {
              setError("Erro ao carregar formulario de pagamento. Tente recarregar a pagina.");
            }
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
