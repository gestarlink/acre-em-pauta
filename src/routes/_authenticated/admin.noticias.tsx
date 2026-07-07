import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPosts, updatePostStatus, deletePost } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Pencil, Trash2, ExternalLink, Instagram } from "lucide-react";

const q = queryOptions({ queryKey: ["admin", "posts"], queryFn: () => listPosts() });

export const Route = createFileRoute("/_authenticated/admin/noticias")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
});

const STATUS_BADGE: Record<string, string> = {
  publicado: "bg-primary/15 text-primary",
  rascunho: "bg-muted text-muted-foreground",
  revisao: "bg-accent/20 text-accent-foreground",
  agendado: "bg-forest/15 text-forest",
};

function Page() {
  const { data } = useSuspenseQuery(q);
  const qc = useQueryClient();
  const upd = useServerFn(updatePostStatus);
  const del = useServerFn(deletePost);
  const m = useMutation({
    mutationFn: (v: { id: string; status: any }) => upd({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); toast.success("Atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); toast.success("Removido"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">Notícias</h1>
      <p className="text-sm text-muted-foreground">Gerencie publicações, rascunhos e agendamentos.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.posts.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{catName(p.category_id)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${STATUS_BADGE[p.status] ?? "bg-muted"}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.views_count}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/admin/criar"
                      search={{ id: p.id }}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-bold uppercase tracking-wider hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Link>
                    {p.status === "publicado" && (
                      <a
                        href={`/noticia/${p.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-bold uppercase tracking-wider hover:bg-muted"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver
                      </a>
                    )}
                    {p.status === "publicado" && (
                      <Link
                        to="/admin/gerador-social"
                        search={{ id: p.id }}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10"
                      >
                        <Instagram className="h-3 w-3" /> Gerar post Instagram
                      </Link>
                    )}
                    {p.status !== "publicado" ? (
                      <button onClick={() => m.mutate({ id: p.id, status: "publicado" })} className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90">Publicar</button>
                    ) : (
                      <button onClick={() => m.mutate({ id: p.id, status: "rascunho" })} className="rounded-md border border-border px-2.5 py-1 text-xs font-bold uppercase tracking-wider hover:bg-muted">Despublicar</button>
                    )}
                    <button
                      onClick={() => { if (confirm(`Remover "${p.title}"?`)) delM.mutate(p.id); }}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}