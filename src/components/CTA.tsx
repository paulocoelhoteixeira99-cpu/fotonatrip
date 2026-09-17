"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-32" ref={ref}>
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-[2rem] overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          <div className="absolute inset-0 glass" />

          <div className="relative px-8 py-20 md:px-16 text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Pronto para encontrar{" "}
              <span className="gradient-text">suas fotos</span>?
            </h2>
            <p className="mt-6 text-muted text-lg max-w-lg mx-auto">
              Tire uma selfie agora e descubra as fotos profissionais feitas de
              voce. E rapido, facil e seguro.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/buscar"
                className="group flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full transition-all font-medium text-lg glow-green hover:scale-105"
              >
                Buscar minhas fotos
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/cadastro"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-foreground px-8 py-4 rounded-full transition-all font-medium text-lg backdrop-blur hover:scale-105"
              >
                Cadastrar como fotografo
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
