import { Link, useLocation } from "@tanstack/react-router";
import { Home, Newspaper, Zap, Send } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const LEFT = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/categoria/cidades", icon: Newspaper, label: "Notícias" },
] as const;

const RIGHT = [
  { to: "/plantao", icon: Zap, label: "Plantão" },
  { to: "/enviar-pauta", icon: Send, label: "Enviar" },
] as const;

export function MobileBottomNav() {
  const loc = useLocation();
  // Hide on admin/login
  if (loc.pathname.startsWith("/admin") || loc.pathname.startsWith("/login")) return null;
  const renderItem = (it: { to: string; icon: typeof Home; label: string }) => {
    const active = loc.pathname === it.to;
    const Icon = it.icon;
    return (
      <li key={it.to}>
        <Link
          to={it.to}
          className={`tap-scale relative flex flex-col items-center gap-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            active ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} />
          <span>{it.label}</span>
          <span
            className={`absolute -top-0.5 h-1 w-1 rounded-full bg-accent transition-all duration-300 ${
              active ? "opacity-100 scale-100" : "opacity-0 scale-0"
            }`}
          />
        </Link>
      </li>
    );
  };

  return (
    <nav className="glass-nav fixed inset-x-0 bottom-0 z-40 border-t border-border shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)] md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end">
        {LEFT.map(renderItem)}
        <li className="flex justify-center">
          <Link
            to="/"
            aria-label="Início"
            className="tap-scale -mt-8 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-white shadow-lg ring-1 ring-black/5 transition-shadow hover:shadow-xl"
          >
            <img src={logoIcon} alt="Acre em Pauta" className="h-12 w-12 object-contain" />
          </Link>
        </li>
        {RIGHT.map(renderItem)}
      </ul>
      <div className="safe-bottom" />
    </nav>
  );
}