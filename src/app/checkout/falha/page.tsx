"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { XCircle, ShoppingCart, ScanFace } from "lucide-react";

export default function CheckoutFalhaPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-6 text-center">
          <div className="glass rounded-3xl p-10">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold mb-3">Pagamento nao aprovado</h1>

            <p className="text-muted mb-8">
              Houve um problema com o pagamento. Suas fotos continuam no carrinho
              para voce tentar novamente.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href="/carrinho"
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                Tentar novamente
              </Link>
              <Link
                href="/buscar"
                className="flex items-center justify-center gap-2 glass hover:bg-white/10 py-3.5 rounded-xl font-medium transition-colors"
              >
                <ScanFace className="w-5 h-5" />
                Voltar para busca
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
