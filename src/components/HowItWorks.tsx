"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Camera, ScanFace, ShoppingBag, Download } from "lucide-react";

const steps = [
  {
    icon: Camera,
    title: "Fotografo registra o evento",
    description:
      "O fotografo faz as fotos do evento ou ponto turistico e envia para a plataforma.",
    color: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    icon: ScanFace,
    title: "Voce tira uma selfie",
    description:
      "Use a camera do seu celular para tirar uma selfie rapida. A IA faz o resto.",
    color: "from-green-500/20 to-green-600/5",
  },
  {
    icon: ShoppingBag,
    title: "Encontre e compre",
    description:
      "Veja todas as fotos profissionais onde voce aparece e escolha as que quiser.",
    color: "from-teal-500/20 to-teal-600/5",
  },
  {
    icon: Download,
    title: "Baixe em alta qualidade",
    description:
      "Receba suas fotos em alta resolucao, prontas para postar e guardar para sempre.",
    color: "from-emerald-400/20 to-emerald-500/5",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="como-funciona" className="relative py-32" ref={ref}>
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-sm text-primary font-medium uppercase tracking-wider">
            Como funciona
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
            Simples como tirar uma{" "}
            <span className="gradient-text">selfie</span>
          </h2>
          <p className="mt-4 text-muted text-lg max-w-xl mx-auto">
            Em poucos segundos voce encontra todas as fotos profissionais feitas
            de voce.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative"
            >
              <div className="relative glass rounded-3xl p-8 h-full hover:bg-white/5 transition-all duration-300 hover:-translate-y-1">
                {/* Step number */}
                <div className="absolute top-6 right-6 text-6xl font-bold text-white/[0.03]">
                  {i + 1}
                </div>

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <step.icon className="w-6 h-6 text-primary" />
                </div>

                <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                <p className="text-muted text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
