import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import CartBar from "@/components/CartBar";
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
  title: "fotonatrip - Encontre suas fotos de viagem com IA",
  description:
    "Tire uma selfie e encontre todas as fotos profissionais feitas de voce durante sua viagem. Busca por reconhecimento facial.",
  keywords: ["fotos", "viagem", "reconhecimento facial", "fotografo", "eventos"],
  openGraph: {
    title: "fotonatrip - Encontre suas fotos de viagem com IA",
    description:
      "Tire uma selfie e encontre todas as fotos profissionais feitas de voce durante sua viagem.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
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
          {children}
          <CartBar />
        </CartProvider>
      </body>
    </html>
  );
}
