"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LayoutDashboard, ImageIcon, ShoppingCart, ShoppingBag, ScanFace } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/eventos", label: "Eventos", isRoute: true },
  { href: "/#fotografos", label: "Para fotografos" },
  { href: "/#recursos", label: "Recursos" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const { count: cartCount } = useCart();
  const supabase = createClient();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);

    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data) setRole(data.role);
      }
    }

    checkUser();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/logo-fotonatrip.png"
            alt="fotonatrip"
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              {link.isRoute && <ImageIcon className="w-3.5 h-3.5" />}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/carrinho"
            className="relative p-2 text-muted hover:text-foreground transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {cartCount > 9 ? "9+" : cartCount}
              </motion.span>
            )}
          </Link>
          {user ? (
            <>
              <Link
                href="/minhas-compras"
                className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2 flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                Minhas compras
              </Link>
              {role === "photographer" && (
                <Link
                  href="/dashboard"
                  className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2 flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              <Link
                href="/buscar"
                className="text-sm bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full transition-colors font-medium"
              >
                Buscar fotos
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="text-sm bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full transition-colors font-medium"
              >
                Sou fotografo
              </Link>
            </>
          )}
        </div>

        {/* Mobile quick actions + menu button */}
        <div className="md:hidden flex items-center gap-1">
          <Link
            href="/buscar"
            className="p-2 text-muted hover:text-foreground transition-colors"
          >
            <ScanFace className="w-5 h-5" />
          </Link>
          <Link
            href="/eventos"
            className="p-2 text-muted hover:text-foreground transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </Link>
          <Link
            href="/carrinho"
            className="relative p-2 text-muted hover:text-foreground transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-muted hover:text-foreground transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass mt-2 mx-4 rounded-2xl overflow-hidden"
          >
            <nav className="flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-muted hover:text-foreground transition-colors px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-2"
                >
                  {link.isRoute && <ImageIcon className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}
              <Link
                href="/carrinho"
                onClick={() => setMenuOpen(false)}
                className="text-sm text-muted hover:text-foreground transition-colors px-4 py-3 rounded-xl hover:bg-white/5 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Carrinho
                </span>
                {cartCount > 0 && (
                  <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
              <hr className="border-border my-2" />
              {user ? (
                <>
                  <Link
                    href="/minhas-compras"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm text-muted hover:text-foreground transition-colors px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Minhas compras
                  </Link>
                  {role === "photographer" && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted hover:text-foreground transition-colors px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  )}
                  <Link
                    href="/buscar"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-xl transition-colors font-medium text-center mt-1"
                  >
                    Buscar fotos
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm text-muted hover:text-foreground transition-colors px-4 py-3 rounded-xl hover:bg-white/5"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-xl transition-colors font-medium text-center mt-1"
                  >
                    Sou fotografo
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
