"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ScanFace, Globe, Lock, Smartphone } from "lucide-react";

const features = [
  {
    icon: ScanFace,
    title: "Busca facial com IA",
    description:
      "Tecnologia de reconhecimento facial de ponta. Tire uma selfie e encontre suas fotos em segundos, mesmo em eventos com milhares de pessoas.",
    highlight: true,
  },
  {
    icon: Globe,
    title: "Eventos e pontos turisticos",
    description:
      "De shows e festas a pontos turisticos e parques. Encontre suas fotos em qualquer lugar que tenha um fotografo parceiro.",
    highlight: false,
  },
  {
    icon: Lock,
    title: "Privacidade em primeiro lugar",
    description:
      "Seus dados faciais sao usados apenas para a busca e nunca sao compartilhados. As fotos ficam armazenadas com seguranca.",
    highlight: false,
  },
  {
    icon: Smartphone,
    title: "100% mobile",
    description:
      "Funciona direto do navegador do celular. Sem precisar baixar nenhum aplicativo. Tire a selfie, encontre e compre.",
    highlight: false,
  },
];

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="recursos" className="relative py-32" ref={ref}>
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-sm text-primary font-medium uppercase tracking-wider">
            Recursos
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
            Tecnologia que{" "}
            <span className="gradient-text">conecta</span> pessoas
          </h2>
          <p className="mt-4 text-muted text-lg max-w-xl mx-auto">
            Uma plataforma feita para tornar a experiencia de encontrar e comprar
            fotos algo magico.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`group rounded-3xl p-10 transition-all duration-300 hover:-translate-y-1 ${
                feature.highlight
                  ? "bg-gradient-to-br from-primary/10 via-surface-light to-surface border border-primary/20 glow-green"
                  : "glass hover:bg-white/5"
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
                  feature.highlight
                    ? "bg-primary/20"
                    : "bg-white/5"
                }`}
              >
                <feature.icon
                  className={`w-6 h-6 ${
                    feature.highlight ? "text-primary" : "text-muted"
                  } group-hover:text-primary transition-colors`}
                />
              </div>

              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
