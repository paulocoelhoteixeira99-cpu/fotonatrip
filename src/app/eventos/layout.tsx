import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eventos",
  description:
    "Veja os eventos disponíveis na Fotonatrip. Encontre suas fotos de viagem, festas e eventos usando reconhecimento facial.",
  alternates: { canonical: "https://www.fotonatrip.com.br/eventos" },
};

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
