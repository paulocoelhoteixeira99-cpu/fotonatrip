import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative border-t border-border py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo-fotonatrip.png"
                alt="fotonatrip"
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm text-muted leading-relaxed">
              Encontre suas fotos de viagem com inteligencia artificial.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Plataforma</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/buscar" className="text-sm text-muted hover:text-foreground transition-colors">
                  Buscar fotos
                </Link>
              </li>
              <li>
                <Link href="/eventos" className="text-sm text-muted hover:text-foreground transition-colors">
                  Eventos
                </Link>
              </li>
              <li>
                <Link href="/cadastro" className="text-sm text-muted hover:text-foreground transition-colors">
                  Para fotografos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Suporte</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/ajuda" className="text-sm text-muted hover:text-foreground transition-colors">
                  Central de ajuda
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-sm text-muted hover:text-foreground transition-colors">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos" className="text-sm text-muted hover:text-foreground transition-colors">
                  Termos de uso
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Contato</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:contato@fotonatrip.com" className="text-sm text-muted hover:text-foreground transition-colors">
                  contato@fotonatrip.com
                </a>
              </li>
              <li>
                <a href="https://instagram.com/fotonatrip" target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-foreground transition-colors">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted">
            {new Date().getFullYear()} fotonatrip. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted">
            Feito com dedicacao no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
