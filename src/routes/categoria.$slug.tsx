import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { queryOptions, useSuspenseQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getLatestPaged } from "@/lib/posts.functions";

const getCategory = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: cat } = await supabaseAdmin.from("categories").select("*").eq("slug", data.slug).maybeSingle();
    return { cat };
  });

const catQ = (slug: string) => queryOptions({ queryKey: ["cat", slug], queryFn: () => getCategory({ data: { slug } }) });

export const Route = createFileRoute("/categoria/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(catQ(params.slug)),
  component: CategoryPage,
  notFoundComponent: () => <div className="p-8">Categoria não encontrada</div>,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(catQ(slug));
  const infinite = useInfiniteQuery({
    queryKey: ["cat-posts", slug],
    queryFn: ({ pageParam }) => getLatestPaged({ data: { offset: pageParam as number, limit: 10, categorySlug: slug } }),
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
  const posts = infinite.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 pb-24 md:pb-10">
        <h1 className="border-b-2 border-primary pb-3 font-display text-3xl font-bold uppercase tracking-wide text-primary">{data.cat?.name ?? "Categoria"}</h1>
        <ul className="mt-8 grid gap-6 md:grid-cols-2">
          {posts.map((p) => (
            <li key={p.id} className="fade-in-up rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md">
              <Link to="/noticia/$slug" params={{ slug: p.slug }} className="font-display text-xl font-semibold leading-snug text-foreground hover:text-primary">
                {p.title}
              </Link>
              <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
            </li>
          ))}
        </ul>
        {posts.length === 0 && !infinite.isFetching && (
          <p className="mt-12 text-center text-muted-foreground">Nenhuma notícia ainda nesta editoria.</p>
        )}
        <div ref={sentinelRef} className="h-8" />
        {infinite.isFetchingNextPage && <p className="mt-4 text-center text-xs text-muted-foreground">Carregando mais…</p>}
        {!infinite.hasNextPage && posts.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">Você chegou ao fim.</p>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}