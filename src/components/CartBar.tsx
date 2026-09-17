"use client";

import { useCart, formatPrice } from "@/lib/cart";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CartBar() {
  const { count, totalCents, hydrated } = useCart();

  if (!hydrated || count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-3 md:hidden"
      >
        <Link
          href="/carrinho"
          className="flex items-center justify-between bg-primary text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-primary/30"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-primary text-[10px] font-bold rounded-full flex items-center justify-center">
                {count}
              </span>
            </div>
            <span className="text-sm font-medium">Ver carrinho</span>
          </div>
          <span className="font-bold">{formatPrice(totalCents)}</span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
