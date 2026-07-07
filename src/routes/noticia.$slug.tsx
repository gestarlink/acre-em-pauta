import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AdSlot } from "@/components/AdSlot";
import { Clock } from "lucide-react";

const getPost = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: post } = await supabaseAdmin.from("posts").select("*").eq("slug", data.slug).eq("status", "publicado").maybeSingle();
    if (!post) throw notFound();
    return post;
  });

const postQuery = (slug: string) => queryOptions({ queryKey: ["post", slug], queryFn: () => getPost({ data: { slug } }) });

export const Route = createFileRoute("/noticia/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(postQuery(params.slug)),
  component: PostPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Notícia não encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-accent hover:underline">Voltar para a home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-8">Erro: {error.message}</div>,
});

function PostPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postQuery(slug));
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-4 py-10">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-accent">{post.tags?.[0] ?? "Notícia"}</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-foreground md:text-5xl text-balance">{post.title}</h1>
        {post.subtitle && <p className="mt-4 text-lg text-muted-foreground">{post.subtitle}</p>}
        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          <span>Por {post.author_name}</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.published_at && new Date(post.published_at).toLocaleString("pt-BR")}</span>
        </div>
        <AdSlot slot="article_top" variant="banner" />
        {(() => {
          const body = post.body ?? "";
          const half = Math.floor(body.length / 2);
          // split at nearest paragraph break to the midpoint
          const breakAt = body.indexOf("\n\n", half);
          const cut = breakAt > 0 ? breakAt : half;
          const first = body.slice(0, cut);
          const second = body.slice(cut);
          return (
            <>
              <div className="fade-in-up prose prose-stone mt-8 max-w-none whitespace-pre-line font-serif text-lg leading-relaxed text-foreground">
                {first}
              </div>
              {second && <AdSlot slot="article_mid" variant="banner" />}
              {second && (
                <div className="prose prose-stone mt-2 max-w-none whitespace-pre-line font-serif text-lg leading-relaxed text-foreground">
                  {second}
                </div>
              )}
            </>
          );
        })()}
        <AdSlot slot="article_bottom" variant="banner" />
      </article>
      <SiteFooter />
    </div>
  );
}