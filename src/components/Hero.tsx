"use client";

import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import Link from "next/link";

const floatingPhotos = [
  { rotate: -6, x: -40, y: 20, delay: 0 },
  { rotate: 3, x: 30, y: -10, delay: 0.1 },
  { rotate: -3, x: -20, y: 40, delay: 0.2 },
  { rotate: 5, x: 40, y: 0, delay: 0.15 },
  { rotate: -4, x: 0, y: 30, delay: 0.25 },
  { rotate: 2, x: -30, y: -20, delay: 0.05 },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass px-4 py-2 rounded-full flex items-center gap-2 mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted">
            Busca por reconhecimento facial
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] max-w-5xl"
        >
          Suas fotos de viagem,{" "}
          <span className="gradient-text">encontradas por IA</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg md:text-xl text-muted max-w-2xl leading-relaxed"
        >
          Tire uma selfie e encontre todas as fotos profissionais feitas de voce
          durante sua viagem. Simples, rapido e magico.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/buscar"
            className="group flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full transition-all font-medium text-lg glow-green hover:scale-105"
          >
            <Search className="w-5 h-5" />
            Encontrar minhas fotos
          </Link>
          <Link
            href="/cadastro"
            className="flex items-center gap-2 glass hover:bg-white/10 text-foreground px-8 py-4 rounded-full transition-all font-medium text-lg hover:scale-105"
          >
            Sou fotografo
          </Link>
        </motion.div>

        {/* Floating photo grid */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-20 w-full max-w-4xl"
        >
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {floatingPhotos.map((photo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: photo.rotate }}
                transition={{
                  duration: 0.6,
                  delay: 0.6 + photo.delay,
                  ease: "easeOut",
                }}
                whileHover={{
                  scale: 1.08,
                  rotate: 0,
                  zIndex: 10,
                  transition: { duration: 0.2 },
                }}
                className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-surface-light to-surface border border-border overflow-hidden cursor-pointer relative group"
              >
                {/* Placeholder shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
                  <svg
                    className="w-8 h-8 text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-16 flex flex-wrap justify-center gap-12 text-center"
        >
          {[
            { value: "2s", label: "para encontrar suas fotos" },
            { value: "99%", label: "precisao facial" },
            { value: "7%", label: "menor comissao do mercado" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold gradient-text">
                {stat.value}
              </div>
              <div className="text-sm text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
