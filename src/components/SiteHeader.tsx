import { Link } from "@tanstack/react-router";
import { Search, Send, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { to: "/categoria/politica", label: "Política" },
  { to: "/categoria/cidades", label: "Cidades" },
  { to: "/categoria/policia", label: "Polícia" },
  { to: "/categoria/economia", label: "Economia" },
  { to: "/categoria/esporte", label: "Esporte" },
  { to: "/categoria/cultura", label: "Cultura" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 shadow-md">
      {/* Single white bar — logo + nav + actions */}
      <div className="bg-white text-foreground">
        {/* Mobile: only centered logo */}
        <div className="flex h-16 items-center justify-center px-4 md:hidden">
          <Link to="/" aria-label="Acre em Pauta">
            <Logo compact invert={false} />
          </Link>
        </div>

        {/* Desktop: full header */}
        <div className="mx-auto hidden h-20 max-w-7xl items-center gap-6 px-4 md:flex">
          <Link to="/" className="shrink-0">
            <Logo compact invert={false} />
          </Link>

          <nav className="flex flex-1 items-center justify-start gap-0">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="whitespace-nowrap px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground/80 transition-colors hover:text-primary lg:px-3 lg:text-[12px] [&.active]:text-primary"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button aria-label="Buscar" className="rounded-full p-1.5 text-foreground hover:bg-black/5">
              <Search className="h-[18px] w-[18px]" />
            </button>
            <Link
              to="/enviar-pauta"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <Send className="h-3.5 w-3.5" /> Enviar Pauta
            </Link>
            <a
              href="https://wa.me/5568999990000"
              aria-label="WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:opacity-90"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}