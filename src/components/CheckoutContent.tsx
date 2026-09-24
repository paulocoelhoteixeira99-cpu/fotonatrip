"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useCart, formatPrice } from "@/lib/cart";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  CreditCard,
  QrCode,
  CheckCircle,
} from "lucide-react";

initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!, {
  locale: "pt-BR",
});

// MP processing fee rates
const FEE_RATE = {
  card: 0.0499, // 4.99%
  pix: 0.0099, // 0.99%
};

function calcAdjusted(base: number, rate: number) {
  // Round up to next cent to guarantee fee is covered
  return Math.ceil((base * 100) / (1 - rate)) / 100;
}

interface PixData {
  qr_code?: string;
  qr_code_base64?: string;
}

export default function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, clearCart } = useCart();
  const preferenceId = searchParams.get("preference_id");
  const orderId = searchParams.get("order_id");
  const baseAmount = parseFloat(searchParams.get("amount") || "0");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brickReady, setBrickReady] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "pix">("card");
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);

  const cardAmount = calcAdjusted(baseAmount, FEE_RATE.card);
  const pixAmount = calcAdjusted(baseAmount, FEE_RATE.pix);
  const currentAmount = payMethod === "card" ? cardAmount : pixAmount;
  const currentFee = +(currentAmount - baseAmount).toFixed(2);

  const checkPaymentStatus = useCallback(async () => {
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

  useEffect(() => {
    if (!preferenceId || !orderId) {
      router.replace("/carrinho");
      return;
    }
    // On page load, check if order is already paid (e.g. user paid and came back)
    checkPaymentStatus().then((status) => {
      if (status === "paid") {
        clearCart();
        router.replace(`/checkout/sucesso?order=${orderId}`);
      }
    });
  }, [preferenceId, orderId, router]);

  // Poll payment status when Pix QR code is showing
  useEffect(() => {
    if (!pixData || pixConfirmed) return;
    const interval = setInterval(async () => {
      const status = await checkPaymentStatus();
      if (status === "paid") {
        setPixConfirmed(true);
        clearInterval(interval);
        clearCart();
        setTimeout(() => {
          router.push(`/checkout/sucesso?order=${orderId}`);
        }, 2000);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pixData, pixConfirmed, orderId, checkPaymentStatus, clearCart, router]);

  async function handlePixPayment() {
    setPixLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: {
            transaction_amount: pixAmount,
            payment_method_id: "pix",
            payer: {},
          },
          orderId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao gerar Pix");
        setPixLoading(false);
        return;
      }

      if (data.pix) {
        setPixData(data.pix);
      } else if (data.status === "approved") {
        clearCart();
        router.push(`/checkout/sucesso?order=${orderId}`);
      } else {
        clearCart();
        router.push(`/checkout/sucesso?order=${orderId}&status=pending`);
      }
    } catch {
      setError("Erro de conexao. Tente novamente.");
    }
    setPixLoading(false);
  }

  async function copyPixCode() {
    if (!pixData?.qr_code) return;
    await navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  if (!preferenceId || !orderId || baseAmount === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Pix QR Code screen
  if (pixData) {
    if (pixConfirmed) {
      return (
        <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Pagamento confirmado!</h2>
            <p className="text-muted text-sm mb-4">
              Redirecionando para suas fotos...
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
        <div className="glass rounded-2xl p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Pague com Pix</h2>
          <p className="text-muted text-sm mb-6">
            Escaneie o QR Code ou copie o codigo para pagar{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(pixAmount * 100)}
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

          <div className="flex items-center justify-center gap-2 text-xs text-yellow-400 mb-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Aguardando confirmacao do pagamento...
          </div>

          <Link
            href={`/checkout/sucesso?order=${orderId}&status=pending`}
            onClick={() => clearCart()}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Ir para minhas compras
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

      {/* Price breakdown */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted">
            {items.length} foto{items.length !== 1 ? "s" : ""}
          </span>
          <span>{formatPrice(baseAmount * 100)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">
            Taxa de processamento ({payMethod === "card" ? "cartao" : "Pix"})
          </span>
          <span className="text-yellow-400">
            + {formatPrice(currentFee * 100)}
          </span>
        </div>
        <hr className="border-border mb-2" />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="gradient-text text-lg">
            {formatPrice(currentAmount * 100)}
          </span>
        </div>
      </div>

      {/* Payment method tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPayMethod("card")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            payMethod === "card"
              ? "bg-primary text-white"
              : "glass text-muted hover:text-foreground"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Cartao
        </button>
        <button
          onClick={() => setPayMethod("pix")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            payMethod === "pix"
              ? "bg-primary text-white"
              : "glass text-muted hover:text-foreground"
          }`}
        >
          <QrCode className="w-4 h-4" />
          Pix
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {/* Card payment via Brick */}
      {payMethod === "card" && (
        <>
          {processing && (
            <div className="flex items-center justify-center gap-3 py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted">Processando pagamento...</span>
            </div>
          )}

          {!brickReady && !processing && (
            <div className="flex items-center justify-center gap-3 py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
              <span className="text-sm text-muted">Carregando formulario...</span>
            </div>
          )}

          <div className={processing ? "hidden" : ""}>
            <Payment
              initialization={{
                amount: cardAmount,
              }}
              customization={{
                paymentMethods: {
                  creditCard: "all",
                  debitCard: "all",
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
                    const reasons: Record<string, string> = {
                      cc_rejected_bad_filled_card_number: "Numero do cartao incorreto.",
                      cc_rejected_bad_filled_date: "Data de validade incorreta.",
                      cc_rejected_bad_filled_security_code: "Codigo de seguranca incorreto.",
                      cc_rejected_bad_filled_other: "Dados do cartao incorretos.",
                      cc_rejected_insufficient_amount: "Saldo insuficiente.",
                      cc_rejected_call_for_authorize: "Ligue para a operadora do cartao para autorizar.",
                      cc_rejected_card_disabled: "Cartao desabilitado. Ative-o com a operadora.",
                      cc_rejected_max_attempts: "Limite de tentativas. Use outro cartao.",
                      cc_rejected_duplicated_payment: "Pagamento duplicado. Ja existe um pagamento com esse valor.",
                      cc_rejected_high_risk: "Pagamento recusado por seguranca. Tente outro cartao.",
                      cc_rejected_card_type_not_allowed: "Tipo de cartao nao aceito.",
                      cc_rejected_other_reason: "Pagamento recusado pela operadora.",
                    };
                    const detail = data.status_detail || "";
                    const reason = reasons[detail] || "Pagamento recusado. Verifique os dados e tente novamente.";
                    setError(reason);
                    setProcessing(false);
                  } else {
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
              onError={(err) => {
                console.error("Payment Brick error:", err);
                if (!brickReady) {
                  setError("Erro ao carregar formulario. Tente recarregar a pagina.");
                }
              }}
            />
          </div>
        </>
      )}

      {/* Pix payment */}
      {payMethod === "pix" && (
        <div className="glass rounded-2xl p-6 sm:p-8 text-center">
          <QrCode className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Pagamento instantaneo via Pix</h3>
          <p className="text-muted text-sm mb-6">
            Clique no botao abaixo para gerar o QR Code Pix no valor de{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(pixAmount * 100)}
            </span>
          </p>
          <button
            onClick={handlePixPayment}
            disabled={pixLoading}
            className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {pixLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando Pix...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                Gerar QR Code Pix
              </>
            )}
          </button>
          <p className="text-xs text-muted mt-4">
            O Pix tem limite diario de transferencias. Consulte o app do seu banco.
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mt-8 text-xs text-muted">
        <ShieldCheck className="w-4 h-4" />
        Pagamento seguro processado pelo Mercado Pago
      </div>
    </div>
  );
}
