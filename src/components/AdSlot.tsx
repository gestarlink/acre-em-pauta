import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getPublicSettings } from "@/lib/settings.functions";

type Props = {
  slot: string;
  label?: string;
  className?: string;
  variant?: "banner" | "square" | "inline" | "native";
};

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

export function AdSlot({ slot, label = "Publicidade", className = "", variant = "banner" }: Props) {
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => getPublicSettings(),
    staleTime: 60_000,
  });

  const adsense = data?.adsense;
  const house = data?.houseAds.slots?.[slot];
  const useAdSense = adsense?.enabled && adsense.publisherId && !house;

  // Load AdSense script once
  useEffect(() => {
    if (!useAdSense || typeof window === "undefined") return;
    const id = "adsbygoogle-js";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense!.publisherId}`;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, [useAdSense, adsense]);

  // Banner = leaderboard, square = MPU, inline = thin strip, native = card 16/9.
  // Mobile gets taller blocks (uses 1:1 / 4:5 mobile creative); desktop uses 5:1.
  const hasMobileImage = !!house?.imageUrlMobile;
  const sizes = variant === "square"
    ? "aspect-square min-h-[300px]"
    : variant === "inline"
      ? "h-[90px] md:h-[110px]"
      : variant === "native"
        ? "min-h-[280px] md:min-h-[360px]"
        : `${hasMobileImage ? "aspect-[4/5] min-h-[220px]" : "aspect-[5/1] min-h-[220px]"} md:aspect-[5/1] md:min-h-[160px]`;

  // Native card variant — looks like a featured news card, labeled "Patrocinado"
  if (variant === "native") {
    if (!house?.imageUrl) {
      return (
        <aside className={`my-8 ${className}`} aria-label={label}>
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
            <p className="font-display text-xs font-bold uppercase tracking-[0.35em] text-muted-foreground">Publicidade</p>
          </div>
        </aside>
      );
    }
    return (
      <aside className={`my-8 ${className}`} aria-label={label}>
        <a href={house.linkUrl || "#"} target="_blank" rel="noopener sponsored"
          className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-xl">
          <img src={house.imageUrl} alt={house.alt || house.headline || label} className="aspect-[16/9] w-full bg-muted object-contain transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground shadow">
            Patrocinado
          </span>
        </a>
      </aside>
    );
  }

  return (
    <aside className={`my-6 ${className}`} aria-label={label}>
      <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <div className={`relative overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 ${sizes}`}>
        {house?.imageUrl ? (
          <a href={house.linkUrl || "#"} target="_blank" rel="noopener sponsored" className="block h-full w-full">
            <picture className="block h-full w-full">
              {house.imageUrlMobile && (
                <source media="(max-width: 767px)" srcSet={house.imageUrlMobile} />
              )}
              <img src={house.imageUrl} alt={house.alt || house.headline || label} className="h-full w-full object-contain" />
            </picture>
            {house.headline && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-sm font-semibold text-white">
                {house.headline}
              </div>
            )}
          </a>
        ) : house?.html ? (
          <div className="p-4" dangerouslySetInnerHTML={{ __html: house.html }} />
        ) : useAdSense ? (
          <ins
            className="adsbygoogle block"
            style={{ display: "block", width: "100%", height: variant === "square" ? 250 : 120 }}
            data-ad-client={adsense!.publisherId}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <div className="flex h-full min-h-[100px] items-center justify-center">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.35em] text-muted-foreground">Publicidade</p>
          </div>
        )}
      </div>
    </aside>
  );
}