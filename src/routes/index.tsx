import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Clock, Zap } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AdSlot } from "@/components/AdSlot";
import { HomeHero } from "@/components/HomeHero";
import { getHomeData, getLatestPaged } from "@/lib/posts.functions";
import catPolitica from "@/assets/cat-politica.jpg";
import catCidades from "@/assets/cat-cidades.jpg";
import catPolicia from "@/assets/cat-policia.jpg";
import catEconomia from "@/assets/cat-economia.jpg";
import catEsporte from "@/assets/cat-esporte.jpg";
import catAmazonia from "@/assets/cat-amazonia.jpg";
import authorRaimundo from "@/assets/author-raimundo.jpg";

const homeQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acre em Pauta — Conectado ao que importa" },
      { name: "description", content: "Notícias do Acre em tempo real: política, cidades, polícia, economia, esporte, cultura e Amazônia." },
      { property: "og:title", content: "Acre em Pauta" },
      { property: "og:description", content: "Portal regional de notícias do Acre." },
      { property: "og:image", content: "/og-home.jpg" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Index,
});

const CAT_IMAGES: Record<string, string> = {
  politica: catPolitica, cidades: catCidades, policia: catPolicia,
  economia: catEconomia, esporte: catEsporte, amazonia: catAmazonia,
  cultura: catAmazonia, opiniao: catPolitica, videos: catCidades, plantao: catPolicia,
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
}

function Index() {
  const { data } = useSuspenseQuery(homeQuery);
  const { featured, latest, breaking, categories, opinion } = data;

  const infinite = useInfiniteQuery({
    queryKey: ["latest-infinite"],
    queryFn: ({ pageParam }) => getLatestPaged({ data: { offset: pageParam as number, limit: 8 } }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
  });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && infinite.hasNextPage && !infinite.isFetchingNextPage) {
        infinite.fetchNextPage();
      }
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [infinite]);
  const allPosts = infinite.data?.pages.flatMap((p) => p.items) ?? [];

  const heroSlides = [
    ...(featured ? [featured] : []),
    ...latest.filter((p) => p.id !== featured?.id).slice(0, 4),
  ].map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? null,
    cover_image_url: (p as { cover_image_url?: string | null }).cover_image_url ?? null,
    published_at: p.published_at ?? null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero — slider de destaques + slide patrocinado */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <HomeHero slides={heroSlides} />

          {/* Sidebar */}
          <aside className="rounded-2xl border border-border bg-card p-5">
            <h2 className="border-b-2 border-accent pb-2 font-display text-sm font-bold uppercase tracking-widest text-primary">Últimas Notícias</h2>
            <ul className="mt-4 space-y-4">
              {latest.slice(0, 4).map((p, i) => (
                <li key={p.id} className="group flex gap-3 border-b border-border pb-4 last:border-0">
                  <span className="font-display text-2xl font-bold text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <Link to="/noticia/$slug" params={{ slug: p.slug }} className="font-semibold leading-snug text-foreground group-hover:text-primary">
                      {p.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{timeAgo(p.published_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
        {/* Ad slot — após o slide */}
        <div className="mt-6">
          <AdSlot slot="home_top" variant="banner" />
        </div>
      </section>

      {/* Plantão */}
      <section className="mt-8 border-y border-border bg-breaking text-breaking-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-hidden px-4 py-3">
          <span className="flex shrink-0 items-center gap-2 rounded-md bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-widest">
            <Zap className="h-3 w-3" /> Plantão
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="marquee flex gap-8 whitespace-nowrap text-sm font-medium">
              {[...breaking, ...breaking].map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-current opacity-60" /> {b.title}
                </span>
              ))}
              {breaking.length === 0 && <span>Acompanhe o Acre em tempo real.</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Editorias */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between border-b-2 border-primary pb-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-primary">Editorias</h2>
          <Link to="/" className="text-sm font-semibold text-accent hover:underline">Ver mais →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
          {categories.filter((c) => !["opiniao", "videos", "plantao"].includes(c.slug)).slice(0, 6).map((c) => (
            <Link key={c.id} to="/categoria/$slug" params={{ slug: c.slug }} className="group block">
              <div className="overflow-hidden rounded-lg">
                <img src={CAT_IMAGES[c.slug] ?? catAmazonia} alt={c.name} className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-110" width={800} height={600} loading="lazy" />
              </div>
              <h3 className="mt-3 font-display text-xs font-bold uppercase tracking-widest text-primary">{c.name}</h3>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {latest.find((p) => p.category_id === c.id)?.title ?? "Acompanhe as últimas."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Mais lidas + Opinião */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="border-b-2 border-primary pb-3 font-display text-2xl font-bold uppercase tracking-wide text-primary">Mais Lidas</h2>
          <ol className="mt-6 space-y-5">
            {allPosts.flatMap((p, i) => {
              const item = (
                <li key={p.id} className="fade-in-up flex gap-5 border-b border-border pb-5 last:border-0">
                  <span className="font-display text-4xl font-bold text-accent">{i + 1}</span>
                  <div className="flex-1">
                    <Link to="/noticia/$slug" params={{ slug: p.slug }} className="font-display text-lg font-semibold leading-snug text-foreground hover:text-primary">
                      {p.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p>
                  </div>
                </li>
              );
              if (i === 2) {
                return [item, (
                  <li key={`ad-${p.id}`} className="list-none">
                    <AdSlot slot="home_infeed" variant="banner" />
                  </li>
                )];
              }
              return [item];
            })}
            {allPosts.length === 0 && !infinite.isFetching && (
              <li className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                Nenhuma notícia publicada ainda. Acesse o painel e clique em <strong>Buscar notícias</strong>.
              </li>
            )}
          </ol>
          <div ref={sentinelRef} className="h-8" />
          {infinite.isFetchingNextPage && (
            <p className="mt-4 text-center text-xs text-muted-foreground">Carregando mais notícias…</p>
          )}
          {!infinite.hasNextPage && allPosts.length > 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">Você chegou ao fim.</p>
          )}
        </div>
        <aside className="space-y-6">
          <div>
            <h2 className="border-b-2 border-primary pb-3 font-display text-2xl font-bold uppercase tracking-wide text-primary">Opinião</h2>
            <div className="mt-6 space-y-6">
              {opinion.map((o) => (
                <Link key={o.id} to="/noticia/$slug" params={{ slug: o.slug }} className="flex gap-4 group">
                  <img src={authorRaimundo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" width={56} height={56} loading="lazy" />
                  <div>
                    <h3 className="font-display text-base font-semibold leading-snug text-foreground group-hover:text-primary">{o.title}</h3>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{o.author_name} · Jornalista</p>
                  </div>
                </Link>
              ))}
              {opinion.length === 0 && <p className="text-sm text-muted-foreground">Em breve, colunas de opinião.</p>}
            </div>
          </div>
          <AdSlot slot="home_sidebar" variant="square" />
        </aside>
      </section>

      <SiteFooter />
    </div>
  );
}
