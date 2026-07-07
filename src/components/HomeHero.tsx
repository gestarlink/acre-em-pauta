import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { Clock, Flame, Sparkles, ArrowRight } from "lucide-react";
import { getPublicSettings } from "@/lib/settings.functions";
import heroBridge from "@/assets/hero-bridge.jpg";

type Slide = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url?: string | null;
  published_at?: string | null;
};

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
}

export function HomeHero({ slides }: { slides: Slide[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => getPublicSettings(),
    staleTime: 60_000,
  });
  const house = settings?.houseAds.slots?.["home_hero"];
  // Só exibe slide patrocinado quando houver imagem real configurada no painel
  const sponsored = house?.imageUrl
    ? {
        imageUrl: house.imageUrl,
        imageUrlMobile: house.imageUrlMobile,
        headline: house.headline ?? "Anuncie aqui",
        support: house.alt ?? "",
        cta: "Saiba mais",
        linkUrl: house.linkUrl ?? "#",
      }
    : null;

  // Intercala: notícia, notícia, [anuncio], notícia, notícia...
  const items: Array<{ type: "news"; slide: Slide } | { type: "ad" }> = [];
  slides.forEach((s, i) => {
    items.push({ type: "news", slide: s });
    if (sponsored && i === 1) items.push({ type: "ad" });
  });
  if (sponsored && items.length && !items.some((i) => i.type === "ad")) items.push({ type: "ad" });

  useEffect(() => {
    if (!embla) return;
    const onSel = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSel);
    onSel();
    const id = setInterval(() => embla.scrollNext(), 6000);
    return () => {
      clearInterval(id);
      embla.off("select", onSel);
    };
  }, [embla]);

  if (items.length === 0) {
    return (
      <div className="relative h-[520px] overflow-hidden rounded-2xl bg-muted">
        <img src={heroBridge} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8 text-white">
          <h1 className="font-display text-4xl font-bold">Acre em Pauta</h1>
          <p className="mt-2 text-white/80">Conectado ao que importa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {items.map((item, idx) => (
            <div key={idx} className="relative min-w-0 flex-[0_0_100%]">
              {item.type === "news" ? (
                <Link to="/noticia/$slug" params={{ slug: item.slide.slug }} className="group relative block">
                  <img
                    src={item.slide.cover_image_url || heroBridge}
                    alt={item.slide.title}
                    className="h-[520px] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    width={1600}
                    height={900}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
                      <Flame className="h-3 w-3" /> Destaque
                    </span>
                    <h2 className="mt-4 max-w-3xl text-balance font-display text-2xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
                      {item.slide.title}
                    </h2>
                    {item.slide.excerpt && (
                      <p className="mt-3 hidden max-w-2xl text-base text-white/85 md:block">{item.slide.excerpt}</p>
                    )}
                    <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-wider text-white/70">
                      <Clock className="h-3 w-3" /> Publicado {timeAgo(item.slide.published_at)}
                    </div>
                  </div>
                </Link>
              ) : (
                <a
                  href={sponsored!.linkUrl}
                  target="_blank"
                  rel="noopener sponsored"
                  className="group relative block"
                >
                  {sponsored!.imageUrl ? (
                    <picture className="block h-[520px] w-full">
                      {sponsored!.imageUrlMobile && (
                        <source media="(max-width: 767px)" srcSet={sponsored!.imageUrlMobile} />
                      )}
                      <img
                        src={sponsored!.imageUrl}
                        alt={sponsored!.headline}
                        className="h-[520px] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </picture>
                  ) : (
                    <div className="flex h-[520px] w-full items-center justify-center bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                      <Sparkles className="mr-2 h-5 w-5 animate-pulse" /> Gerando peça publicitária…
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/30 md:to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:inset-y-0 md:right-auto md:flex md:max-w-[60%] md:flex-col md:justify-center md:p-12">
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
                      <Sparkles className="h-3 w-3" /> Patrocinado
                    </span>
                    <h2 className="mt-4 text-balance font-display text-2xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
                      {sponsored!.headline}
                    </h2>
                    {sponsored!.support && (
                      <p className="mt-3 max-w-xl text-sm text-white/85 md:text-base">{sponsored!.support}</p>
                    )}
                    <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary transition group-hover:gap-3">
                      {sponsored!.cta} <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => embla?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              selected === i ? "w-8 bg-white" : "w-4 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}