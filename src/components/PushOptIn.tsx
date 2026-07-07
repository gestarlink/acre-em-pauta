import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, X } from "lucide-react";
import { subscribePush } from "@/lib/push.functions";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BDKBWtTxsf5aA0NCHCJppogDyQkavVkMXd3ztNZkevmKWdDi2LucULq2iZN7W4kQFVK62lYPqCZg5k5gg9ocNRc";
const DISMISS_KEY = "aep_push_dismissed_at";
const DISMISS_DAYS = 14;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isPreviewOrIframe() {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

export function PushOptIn() {
  const [show, setShow] = useState(false);
  const subscribe = useServerFn(subscribePush);

  useEffect(() => {
    if (isPreviewOrIframe()) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied" || Notification.permission === "granted") return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_DAYS * 86400 * 1000) return;
    const t = setTimeout(() => setShow(true), 25_000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const enable = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      await subscribe({
        data: {
          endpoint: sub.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          userAgent: navigator.userAgent.slice(0, 256),
        },
      });
      toast.success("Você receberá notificações de plantão.");
      setShow(false);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível ativar as notificações.");
      dismiss();
    }
  };

  if (!show) return null;
  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl md:bottom-6 fade-in-up">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Ativar notificações</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Receba alertas de plantão e furos do Acre em primeira mão.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={enable} className="tap-scale rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              Ativar
            </button>
            <button onClick={dismiss} className="tap-scale rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
              Agora não
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Fechar" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}