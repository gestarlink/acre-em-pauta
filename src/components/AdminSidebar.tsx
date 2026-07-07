import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Newspaper, Brain, Inbox, Rss, FileEdit, ImageIcon, Megaphone, Tags, Users, Settings, LogOut, Bell, Instagram, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { toast } from "sonner";

const ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true as boolean | undefined },
  { to: "/admin/noticias", icon: Newspaper, label: "Notícias" },
  { to: "/admin/fila-ia", icon: Brain, label: "Buscador de notícias" },
  { to: "/admin/pautas", icon: Inbox, label: "Pautas recebidas" },
  { to: "/admin/fontes", icon: Rss, label: "Fontes" },
  { to: "/admin/criar", icon: FileEdit, label: "Criar notícia" },
  { to: "/admin/post-social", icon: ImageIcon, label: "Gerar post" },
  { to: "/admin/gerador-social", icon: Instagram, label: "Gerador Social" },
  { to: "/admin/anuncios", icon: Megaphone, label: "Anúncios" },
  { to: "/admin/push", icon: Bell, label: "Push" },
  { to: "/admin/categorias", icon: Tags, label: "Categorias" },
  { to: "/admin/usuarios", icon: Users, label: "Usuários" },
  { to: "/admin/config", icon: Settings, label: "Configurações" },
] as ReadonlyArray<{ to: string; icon: any; label: string; exact?: boolean }>;

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  const nav = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    onNavigate?.();
    nav({ to: "/login" });
  };
  return (
    <>
      <div className="border-b border-sidebar-border p-5">
        <Link to="/admin" onClick={onNavigate} className="inline-flex">
          {/* Pílula clara atrás da logo: evita "restos" do recorte sobre fundo escuro. */}
          <span className="inline-flex items-center rounded-md bg-white/95 px-3 py-2 shadow-sm">
            <Logo compact />
          </span>
        </Link>
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/60">Painel editorial</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {ITEMS.map((it) => {
            const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to as never}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 md:py-2 text-sm font-medium transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                >
                  <Icon className="h-4 w-4" /> {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-3 md:py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  // Fecha o drawer ao trocar de rota.
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Trava scroll do body quando o drawer mobile está aberto.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const current = ITEMS.find((it) => it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to));

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <SidebarBody />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-sidebar-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold">{current?.label ?? "Painel"}</span>
        </div>
        <Link
          to="/admin"
          aria-label="Início do painel"
          className="inline-flex items-center rounded-md bg-white/95 px-2 py-1 shadow-sm"
        >
          <Logo compact />
        </Link>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="relative flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}