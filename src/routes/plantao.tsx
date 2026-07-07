import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Zap, Clock } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPlantaoPosts } from "@/lib/posts.functions";

const plantaoQuery = queryOptions({ queryKey: ["plantao"], queryFn: () => getPlantaoPosts() });

export const Route = createFileRoute("/plantao")({
  head: () => ({
    meta: [
      { title: "Plantão — Acre em Pauta" },
      { name: "description", content: "Alertas urgentes e furos de reportagem em tempo real no Acre." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plantaoQuery),
  component: PlantaoPage,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Página não encontrada</div>,
});

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
}

function PlantaoPage() {
  const { data } = useSuspenseQuery(plantaoQuery);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-breaking text-breaking-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-6">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-current" />
          </span>
          <Zap className="h-5 w-5" />
          <h1 className="font-display text-2xl font-bold uppercase tracking-widest">Plantão</h1>
          <span className="ml-auto text-xs uppercase tracking-widest opacity-80">Ao vivo</span>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-12">
        {data.items.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum alerta de plantão no momento. Tudo calmo por aqui.
          </p>
        )}
        <ul className="space-y-4">
          {data.items.map((p) => (
            <li key={p.id} className="fade-in-up overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
              <Link to="/noticia/$slug" params={{ slug: p.slug }} className="block">
                <div className="flex items-start gap-4 p-4">
                  <span className="mt-1 shrink-0 rounded-md bg-breaking px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-breaking-foreground">
                    Urgente
                  </span>
                  <div className="flex-1">
                    <h2 className="font-display text-lg font-bold leading-snug text-foreground">{p.title}</h2>
                    {p.excerpt && <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p>}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {timeAgo(p.published_at)}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <SiteFooter />
    </div>
  );
}