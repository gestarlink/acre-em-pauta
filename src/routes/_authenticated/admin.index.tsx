import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Newspaper, FileEdit, Brain, Inbox, Eye, Sparkles, Bell, TrendingUp, Flame, Zap } from "lucide-react";
import { getAdminDashboard, fetchFromSources, getDashboardAnalytics } from "@/lib/admin.functions";
import { autoPublish } from "@/lib/ai.functions";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";

const dashQuery = queryOptions({ queryKey: ["admin", "dash"], queryFn: () => getAdminDashboard() });
const analyticsQuery = queryOptions({ queryKey: ["admin", "analytics"], queryFn: () => getDashboardAnalytics() });

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(dashQuery),
    context.queryClient.ensureQueryData(analyticsQuery),
  ]),
  component: Dashboard,
});

function Kpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div className="mt-3 font-display text-3xl font-bold text-foreground">{value.toLocaleString("pt-BR")}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Dashboard() {
  const { data } = useSuspenseQuery(dashQuery);
  const { data: analytics } = useSuspenseQuery(analyticsQuery);
  const fetchFn = useServerFn(fetchFromSources);
  const autoPubFn = useServerFn(autoPublish);
  const qc = useQueryClient();
  const fetchM = useMutation({
    mutationFn: () => fetchFn(),
    onSuccess: (r) => { toast.success(`${r.inserted} novas pautas captadas`); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const autoPubM = useMutation({
    mutationFn: () => autoPubFn({ data: { minRelevance: 70 } }),
    onSuccess: (r) => {
      const msg = r.published > 0
        ? `${r.fetched} captadas, ${r.published} publicadas, ${r.skipped} ignoradas`
        : `${r.fetched} captadas, nenhuma acima de 70% de relevância`;
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Dashboard editorial</h1>
          <p className="text-sm text-muted-foreground">Visão geral do Acre em Pauta hoje.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => fetchM.mutate()} disabled={fetchM.isPending} className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wider text-accent-foreground hover:opacity-90 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {fetchM.isPending ? "Captando…" : "Buscar notícias"}
          </button>
          <button onClick={() => autoPubM.mutate()} disabled={autoPubM.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Zap className="h-4 w-4" /> {autoPubM.isPending ? "Processando…" : "Publicar automático"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={Newspaper} label="Publicadas" value={data.kpis.published} color="bg-primary/10 text-primary" />
        <Kpi icon={TrendingUp} label="Pub. últimos 7d" value={analytics.publishedLast7} color="bg-forest/10 text-forest" />
        <Kpi icon={Bell} label="Push inscritos" value={analytics.pushSubscribers} color="bg-breaking/10 text-breaking" />
        <Kpi icon={Inbox} label="Pautas novas" value={data.kpis.tipsNew} color="bg-accent/20 text-accent-foreground" />
        <Kpi icon={Eye} label="Total views" value={data.kpis.totalViews} color="bg-secondary text-primary" />
      </div>

      {/* Gráfico de visitas — últimos 14 dias */}
      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-primary">Visitas — últimos 14 dias</h2>
            <p className="text-xs text-muted-foreground">Visualizações de notícias agregadas por dia.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
            <Eye className="h-3 w-3" /> {analytics.series.reduce((a, b) => a + b.count, 0).toLocaleString("pt-BR")} no período
          </span>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.series} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(l: string) => new Date(l).toLocaleDateString("pt-BR")}
              />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#viewsFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top categorias */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold text-primary">Categorias mais vistas</h2>
          {analytics.byCategory.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <div className="mt-4 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byCategory} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {analytics.byCategory.map((c) => (
                      <Cell key={c.id} fill={c.color || "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Notícias recentes */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold text-primary">Notícias recentes</h2>
          <ul className="mt-4 space-y-3">
            {analytics.recent.map((p) => (
              <li key={p.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {p.is_breaking ? <Flame className="h-3.5 w-3.5" /> : <Newspaper className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.status === "publicado" ? "Publicada" : p.status} · {p.views_count?.toLocaleString("pt-BR") ?? 0} views
                    {p.published_at && ` · ${new Date(p.published_at).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </li>
            ))}
            {analytics.recent.length === 0 && <li className="text-sm text-muted-foreground">Sem notícias ainda.</li>}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold text-primary">Mais lidas</h2>
          <ul className="mt-4 space-y-3">
            {data.topPosts.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-border pb-3 last:border-0">
                <span className="font-display text-xl font-bold text-accent w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.views_count} views</p>
                </div>
              </li>
            ))}
            {data.topPosts.length === 0 && <li className="text-sm text-muted-foreground">Sem dados ainda.</li>}
          </ul>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold text-primary">Buscador — recentes</h2>
          <ul className="mt-4 space-y-3">
            {data.queueItems.map((q) => (
              <li key={q.id} className="border-b border-border pb-3 last:border-0">
                <p className="text-sm font-semibold text-foreground">{q.original_title}</p>
                <p className="text-xs text-muted-foreground">{q.source_name} · status: {q.status}</p>
              </li>
            ))}
            {data.queueItems.length === 0 && <li className="text-sm text-muted-foreground">Vazio. Clique em "Buscar notícias".</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}