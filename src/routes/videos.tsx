import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const getVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { data: cat } = await supabaseAdmin
    .from("categories")
    .select("id,name")
    .eq("slug", "videos")
    .maybeSingle();
  if (!cat) return { posts: [] as Array<{ id: string; slug: string; title: string; excerpt: string | null; cover_image_url: string | null; published_at: string | null }> };
  const { data: posts } = await supabaseAdmin
    .from("posts")
    .select("id,slug,title,excerpt,cover_image_url,published_at")
    .eq("status", "publicado")
    .eq("category_id", cat.id)
    .order("published_at", { ascending: false })
    .limit(50);
  return { posts: posts ?? [] };
});

const videosQuery = queryOptions({ queryKey: ["videos"], queryFn: () => getVideos() });

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Vídeos — Acre em Pauta" },
      { name: "description", content: "Vídeos verticais com as principais notícias do Acre." },
      { property: "og:title", content: "Vídeos — Acre em Pauta" },
      { property: "og:description", content: "Reels de notícias do Acre em formato vertical." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(videosQuery),
  component: VideosPage,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
});

function VideosPage() {
  const { data } = useSuspenseQuery(videosQuery);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-12">
        <div className="flex items-end justify-between border-b-2 border-primary pb-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-primary">Vídeos</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reels do Acre</p>
        </div>

        {data.posts.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">Nenhum vídeo publicado ainda.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {data.posts.map((p) => (
              <li key={p.id} className="fade-in-up">
                <Link
                  to="/noticia/$slug"
                  params={{ slug: p.slug }}
                  className="tap-scale group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
                    {p.cover_image_url ? (
                      <img
                        src={p.cover_image_url}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="shimmer h-full w-full" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-black/10">
                      <Play className="ml-0.5 h-4 w-4 fill-primary text-primary" />
                    </div>
                    <h3 className="absolute inset-x-0 bottom-0 p-3 font-display text-sm font-semibold leading-tight text-white line-clamp-3">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}