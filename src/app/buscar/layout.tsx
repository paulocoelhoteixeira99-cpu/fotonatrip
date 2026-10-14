import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buscar Fotos por Reconhecimento Facial",
  description:
    "Encontre suas fotos de evento usando reconhecimento facial. Tire uma selfie e veja todas as fotos em que você aparece em segundos.",
  alternates: { canonical: "https://www.fotonatrip.com.br/buscar" },
};

export default function BuscarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
