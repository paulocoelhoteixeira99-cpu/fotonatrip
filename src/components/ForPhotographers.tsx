"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  TrendingUp,
  Shield,
  Zap,
  DollarSign,
  BarChart3,
  Users,
} from "lucide-react";
import Link from "next/link";

const benefits = [
  {
    icon: DollarSign,
    title: "Apenas 7% de comissao",
    description: "A menor taxa do mercado. Voce define o preco, voce fica com a maior parte.",
  },
  {
    icon: Zap,
    title: "Pagamento automatico",
    description: "O dinheiro cai direto na sua conta do Mercado Pago. Sem esperar repasses.",
  },
  {
    icon: BarChart3,
    title: "Dashboard completo",
    description: "Acompanhe vendas, visualizacoes e performance dos seus eventos em tempo real.",
  },
  {
    icon: Shield,
    title: "Suas fotos protegidas",
    description: "Marca d'agua automatica nas previews. Download so apos o pagamento.",
  },
  {
    icon: Users,
    title: "Mais clientes",
    description: "A busca facial traz os clientes ate voce. Sem precisar procurar um por um.",
  },
  {
    icon: TrendingUp,
    title: "Escale seu negocio",
    description: "Foque em fotografar. A plataforma cuida da venda, entrega e cobranca.",
  },
];

export default function ForPhotographers() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="fotografos" className="relative py-32" ref={ref}>
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm text-primary font-medium uppercase tracking-wider">
              Para fotografos
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Venda suas fotos com a{" "}
              <span className="gradient-text">menor taxa</span> do mercado
            </h2>
            <p className="mt-6 text-muted text-lg leading-relaxed">
              Cadastre-se, envie suas fotos e deixe a inteligencia artificial
              conectar seus clientes as fotos deles. Voce foca no que faz de
              melhor: fotografar.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/cadastro"
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full transition-all font-medium glow-green hover:scale-105"
              >
                Comecar agora
              </Link>
              <Link
                href="#recursos"
                className="flex items-center justify-center gap-2 glass hover:bg-white/10 text-foreground px-8 py-4 rounded-full transition-all font-medium hover:scale-105"
              >
                Ver recursos
              </Link>
            </div>
          </motion.div>

          {/* Right side - benefits grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                className="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300 hover:-translate-y-1"
              >
                <benefit.icon className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold text-sm mb-1.5">{benefit.title}</h3>
                <p className="text-muted text-xs leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
