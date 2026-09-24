"use client";

import { motion } from "framer-motion";
import { Search, ArrowRight, Sparkles, Camera, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";

const floatingPhotos = [
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=500&fit=crop&q=80",
    alt: "Praia tropical com areia branca",
    rotate: -4,
  },
  {
    src: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=400&h=500&fit=crop&crop=faces&q=80",
    alt: "Grupo de amigos curtindo a viagem",
    rotate: 3,
  },
  {
    src: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=500&fit=crop&q=80",
    alt: "Vista panoramica do Rio de Janeiro",
    rotate: -2,
  },
  {
    src: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&h=500&fit=crop&q=80",
    alt: "Praia paradisiaca vista de cima",
    rotate: 5,
  },
  {
    src: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&h=500&fit=crop&crop=faces&q=80",
    alt: "Fotografo registrando viajante",
    rotate: -3,
  },
  {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=500&fit=crop&q=80",
    alt: "Paisagem com lago e montanhas",
    rotate: 2,
  },
];

const features = [
  {
    icon: Camera,
    title: "Fotos profissionais",
    description: "Registrando cada momento",
  },
  {
    icon: Zap,
    title: "Rapido e simples",
    description: "Encontre suas fotos em segundos",
  },
  {
    icon: ShieldCheck,
    title: "Seguro e privado",
    description: "Suas fotos sempre protegidas",
  },
];

export default function Hero() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-end overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/hero-bg.jpg"
            alt="Viajante admirando paisagem tropical"
            className="w-full h-full object-cover object-[75%_center] md:object-center"
          />
          {/* Gradient overlays for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-background/20" />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 pb-10 pt-24 md:pt-32 w-full">
          <div className="max-w-2xl md:max-w-3xl md:mx-auto md:text-center">
            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.08]"
            >
              Os momentos passam.{" "}
              <span className="gradient-text">As fotos ficam.</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 text-lg md:text-xl text-foreground/90 font-medium"
            >
              Sua viagem, eternizada em cada detalhe.
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-3 text-base md:text-lg text-muted leading-relaxed"
            >
              Tire uma selfie e encontre, em segundos, todas as fotos
              profissionais feitas de voce durante a viagem. Simples,{" "}
              <strong className="text-foreground">rapido e magico</strong>.
            </motion.p>

            {/* Search Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex justify-center"
            >
              <Link
                href="/buscar"
                className="group inline-flex items-center gap-3 bg-white text-background pl-5 pr-2 py-2 rounded-full transition-all hover:shadow-lg hover:shadow-white/10 hover:scale-[1.02]"
              >
                <Search className="w-5 h-5 text-muted" />
                <span className="font-medium text-base md:text-lg pr-2">
                  Encontrar minhas fotos
                </span>
                <span className="w-10 h-10 bg-primary rounded-full flex items-center justify-center group-hover:bg-primary-dark transition-colors">
                  <ArrowRight className="w-5 h-5 text-white" />
                </span>
              </Link>
            </motion.div>

            {/* Facial Recognition Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-4 flex justify-center"
            >
              <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted">
                  Busca por reconhecimento facial
                </span>
              </div>
            </motion.div>

            {/* 3 Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 max-w-lg md:mx-auto"
            >
              {features.map((feature) => (
                <div key={feature.title} className="flex flex-col items-center text-center gap-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight">
                      {feature.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted mt-0.5 leading-tight">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Photo Gallery Section */}
      <section className="relative pt-6 pb-16 md:pt-10 md:pb-24 overflow-hidden">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4"
          >
            {floatingPhotos.map((photo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                whileInView={{ opacity: 1, y: 0, rotate: photo.rotate }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: "easeOut",
                }}
                whileHover={{
                  scale: 1.06,
                  rotate: 0,
                  zIndex: 10,
                  transition: { duration: 0.2 },
                }}
                className="aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer relative group shadow-xl shadow-black/30"
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </motion.div>
        </div>

      </section>
    </>
  );
}
