import { Instagram, Facebook, Youtube, MessageCircle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 md:flex-row">
        <p className="text-xs text-sidebar-foreground/70">
          © {new Date().getFullYear()} Acre em Pauta — Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-2">
          <a href="#" aria-label="Instagram" className="rounded-full bg-sidebar-accent p-2 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Instagram className="h-4 w-4" /></a>
          <a href="#" aria-label="Facebook" className="rounded-full bg-sidebar-accent p-2 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Facebook className="h-4 w-4" /></a>
          <a href="#" aria-label="YouTube" className="rounded-full bg-sidebar-accent p-2 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Youtube className="h-4 w-4" /></a>
          <a href="https://wa.me/5568999990000" aria-label="WhatsApp" className="rounded-full bg-sidebar-accent p-2 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><MessageCircle className="h-4 w-4" /></a>
        </div>
      </div>
    </footer>
  );
}