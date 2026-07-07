import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listQueue, fetchFromSources } from "@/lib/admin.functions";
import { analyzeNews, rewriteNews, publishFromRewrite, autoPublish } from "@/lib/ai.functions";
import { Brain, PencilRuler, CheckCircle2, Flame, Loader2, Sparkles, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const q = queryOptions({ queryKey: ["admin", "queue"], queryFn: () => listQueue() });

export const Route = createFileRoute("/_authenticated/admin/fila-ia")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(q);
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeNews);
  const rewrite = useServerFn(rewriteNews);
  const publish = useServerFn(publishFromRewrite);
  const fetchFn = useServerFn(fetchFromSources);
  const autoPubFn = useServerFn(autoPublish);
  const [busy, setBusy] = useState<string | null>(null);
  const [rewrites, setRewrites] = useState<Record<string, any>>({});
  const fetchM = useMutation({
    mutationFn: () => fetchFn(),
    onSuccess: (r) => {
      toast.success(r.inserted ? `${r.inserted} novas notícias captadas` : "Nenhuma notícia nova");
      qc.invalidateQueries({ queryKey: ["admin", "queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const autoPubM = useMutation({
    mutationFn: () => autoPubFn({ data: { minRelevance: 70 } }),
    onSuccess: (r) => {
      const msg = r.published > 0
        ? `${r.fetched} captadas, ${r.published} publicadas, ${r.skipped} ignoradas (relevância baixa)`
        : `${r.fetched} captadas, nenhuma publicada (relevância abaixo de 70)`;
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["admin", "queue"] });
      qc.invalidateQueries({ queryKey: ["admin", "dash"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = async (id: string, fn: () => Promise<any>, ok: string) => {
    setBusy(id);
    try { const r = await fn(); toast.success(ok); qc.invalidateQueries({ queryKey: ["admin"] }); return r; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(null); }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary inline-flex items-center gap-2">
            <Search className="h-7 w-7" /> Buscador de notícias
          </h1>
          <p className="text-sm text-muted-foreground">Pressione o botão para captar manchetes das fontes. "Publicar automático" busca, analisa e publica notícias relevantes de uma vez.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchM.mutate()}
            disabled={fetchM.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wider text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {fetchM.isPending ? "Buscando…" : "Buscar agora"}
          </button>
          <button
            onClick={() => autoPubM.mutate()}
            disabled={autoPubM.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" /> {autoPubM.isPending ? "Processando…" : "Publicar automático"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {data.items.map((item) => {
          const rw = rewrites[item.id];
          return (
            <article key={item.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.source_name} · {item.status}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-foreground">{item.original_title}</h3>
                  {item.original_summary && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{item.original_summary}</p>}
                </div>
                {item.urgency_score != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-breaking/15 px-2 py-1 text-[10px] font-bold uppercase text-breaking">
                    <Flame className="h-3 w-3" /> {item.urgency_score}
                  </span>
                )}
              </div>

              {item.relevance_score != null && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded bg-secondary px-2 py-1"><strong>Relevância:</strong> {item.relevance_score}</span>
                  <span className="rounded bg-secondary px-2 py-1"><strong>Urgência:</strong> {item.urgency_score}</span>
                </div>
              )}

              {rw && (
                <div className="mt-4 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3 text-sm">
                  <p className="font-display font-bold text-primary">{rw.title}</p>
                  <p className="text-xs text-muted-foreground">{rw.subtitle}</p>
                  <p className="mt-2 line-clamp-3">{rw.excerpt}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={busy === item.id} onClick={() => run(item.id, () => analyze({ data: { queueItemId: item.id } }), "Análise concluída")}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20 disabled:opacity-50">
                  {busy === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />} Analisar
                </button>
                <button disabled={busy === item.id} onClick={async () => {
                  const r = await run(item.id, () => rewrite({ data: { queueItemId: item.id } }), "Reescrita pronta");
                  if (r) setRewrites((s) => ({ ...s, [item.id]: r }));
                }} className="inline-flex items-center gap-1 rounded-md bg-accent/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground hover:bg-accent/30 disabled:opacity-50">
                  <PencilRuler className="h-3 w-3" /> Reescrever
                </button>
                {rw && (
                  <button disabled={busy === item.id} onClick={() => run(item.id, () => publish({ data: { rewriteId: rw.id } }), "Publicado!")}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    <CheckCircle2 className="h-3 w-3" /> Aprovar & Publicar
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma notícia captada nos últimos 5 minutos. Clique em "Buscar agora" para captar novas.</p>
        )}
      </div>
    </div>
  );
}