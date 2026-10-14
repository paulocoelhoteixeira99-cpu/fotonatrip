import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import CartBar from "@/components/CartBar";
import PageViewTracker from "@/components/PageViewTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fotonatrip.com.br"),
  title: {
    default: "Fotonatrip — Venda suas fotos de evento com reconhecimento facial",
    template: "%s | Fotonatrip",
  },
  description:
    "Plataforma onde fotógrafos vendem fotos de eventos e clientes encontram suas fotos por reconhecimento facial. Upload em lote, watermark automática, pagamento via Pix e cartão.",
  keywords: [
    "venda de fotos", "fotos de evento", "reconhecimento facial",
    "fotógrafo de evento", "busca por selfie", "fotos de viagem",
    "plataforma para fotógrafos", "fotonatrip",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Fotonatrip",
    title: "Fotonatrip — Venda suas fotos de evento com reconhecimento facial",
    description:
      "Fotógrafos vendem fotos de eventos e clientes encontram suas fotos por reconhecimento facial. Simples, rápido e seguro.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Fotonatrip" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fotonatrip — Venda suas fotos de evento com reconhecimento facial",
    description:
      "Fotógrafos vendem fotos de eventos e clientes encontram suas fotos por reconhecimento facial.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://www.fotonatrip.com.br",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "q60aEkpFGFF4scDtG6YrCp4E-G_NsDUthOibnTf2Y04",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <PageViewTracker />
          {children}
          <CartBar />
        </CartProvider>
      </body>
    </html>
  );
}
