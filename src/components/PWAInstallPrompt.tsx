import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "aep-install-dismissed-at";
const DISMISS_DAYS = 14;

export function PWAInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip if already installed / running standalone
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    // Skip if recently dismissed
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (ts && Date.now() - ts < DISMISS_DAYS * 86400_000) return;
    } catch { /* ignore */ }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      // small delay so it doesn't pop instantly on load
      setTimeout(() => setVisible(true), 1500);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
    setVisible(false);
  };

  if (!visible || !evt) return null;

  return (
    <div className="fade-in-up fixed inset-x-3 bottom-24 z-50 md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm">
      <div className="glass-nav flex items-center gap-3 rounded-2xl border border-border p-3 shadow-xl">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-black/5">
          <img src={logoIcon} alt="" className="h-9 w-9 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight text-foreground">Instale o Acre em Pauta</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            Acesso rápido na tela inicial, sem barra do navegador.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            onClick={install}
            className="tap-scale inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow"
          >
            <Download className="h-3.5 w-3.5" /> Instalar
          </button>
          <button
            onClick={dismiss}
            className="tap-scale inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Agora não
          </button>
        </div>
      </div>
    </div>
  );
}