"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ImageIcon, ShoppingCart, ShoppingBag, ScanFace, LogOut, LayoutDashboard, ShieldCheck, User, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navLinks = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/eventos", label: "Eventos", isRoute: true },
  { href: "/#fotografos", label: "Para fotografos" },
  { href: "/#recursos", label: "Recursos" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const { count: cartCount } = useCart();
  const supabase = createClient();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isPhotographerOrAdmin = profile?.role === "photographer" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  async function handleLogout() {
    if (!window.confirm("Voce deseja mesmo sair?")) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
    setUserMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);

    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    }

    checkUser();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
              className="text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              {link.isRoute && <ImageIcon className="w-3.5 h-3.5" />}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {isPhotographerOrAdmin && (
                <Link
                  href="/dashboard"
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors px-3 py-2 flex items-center gap-1.5"
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

              {/* User dropdown */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="text-sm text-white font-medium max-w-[120px] truncate">
                    {profile?.full_name?.split(" ")[0] || "Usuario"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 glass rounded-xl border border-border shadow-2xl overflow-hidden"
                    >
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <DropdownLink href="/carrinho" icon={ShoppingCart} label="Carrinho" badge={cartCount} onClick={() => setUserMenuOpen(false)} />
                        <DropdownLink href="/minhas-compras" icon={ShoppingBag} label="Minhas compras" onClick={() => setUserMenuOpen(false)} />
                        {isAdmin && (
                          <DropdownLink href="/admin" icon={ShieldCheck} label="Admin" onClick={() => setUserMenuOpen(false)} />
                        )}
                      </div>

                      <div className="border-t border-border py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left text-sm text-red-400 hover:bg-red-400/10 transition-colors px-4 py-2.5 flex items-center gap-3"
                        >
                          <LogOut className="w-4 h-4" />
                          Sair
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
            href="/eventos"
            className="p-2 text-foreground/70 hover:text-foreground transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </Link>
          <Link
            href="/carrinho"
            className="relative p-2 text-foreground/70 hover:text-foreground transition-colors"
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
            className="p-2 text-foreground/70 hover:text-foreground transition-colors"
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
              {/* User info (if logged in) */}
              {user && profile && (
                <>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-medium text-primary">
                      {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{profile.full_name}</p>
                      <p className="text-xs text-muted truncate">{user.email}</p>
                    </div>
                  </div>
                  <hr className="border-border my-2" />
                </>
              )}

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
                  {isPhotographerOrAdmin && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted hover:text-foreground transition-colors px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted hover:text-foreground transition-colors px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/buscar"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-xl transition-colors font-medium text-center mt-1"
                  >
                    Buscar fotos
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-400 hover:bg-red-400/10 transition-colors px-4 py-3 rounded-xl flex items-center gap-2 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
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

function DropdownLink({
  href,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-white/5 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge != null && badge > 0 && (
        <span className="ml-auto w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
