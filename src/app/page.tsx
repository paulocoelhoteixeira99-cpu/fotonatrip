import type { Metadata } from "next";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import ForPhotographers from "@/components/ForPhotographers";
import Features from "@/components/Features";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.fotonatrip.com.br" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Fotonatrip",
  alternateName: "Foto na Trip",
  url: "https://www.fotonatrip.com.br",
  description:
    "Fotonatrip (Foto na Trip) — plataforma onde fotógrafos vendem fotos de eventos e clientes encontram suas fotos por reconhecimento facial.",
  applicationCategory: "PhotographyApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
    description: "Cadastro gratuito para fotógrafos. Taxa de apenas 7% sobre vendas.",
  },
  creator: {
    "@type": "Organization",
    name: "Fotonatrip",
    alternateName: "Foto na Trip",
    url: "https://www.fotonatrip.com.br",
    email: "fotonatrip2026@gmail.com",
    sameAs: ["https://www.instagram.com/fotonatrip_oficial"],
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="overflow-x-hidden">
        <Hero />
        <HowItWorks />
        <ForPhotographers />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
