import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCategories, upsertCategory, deleteCategory } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const q = queryOptions({ queryKey: ["admin", "cats"], queryFn: () => listCategories() });

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(q);
  const qc = useQueryClient();
  const up = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "", color: "", display_order: 99 });

  const create = useMutation({
    mutationFn: () => up({ data: draft }),
    onSuccess: () => { toast.success("Categoria salva"); setDraft({ name: "", slug: "", description: "", color: "", display_order: 99 }); qc.invalidateQueries({ queryKey: ["admin", "cats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["admin", "cats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">Categorias</h1>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold text-primary">Nova categoria</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="slug" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} placeholder="#cor" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input type="number" value={draft.display_order} onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })} placeholder="ordem" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={() => create.mutate()} disabled={create.isPending || !draft.name || !draft.slug}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Criar
          </button>
        </div>
      </section>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Ordem</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {data.categories.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.display_order}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { if (confirm(`Remover ${c.name}?`)) remove.mutate(c.id); }} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" /> Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}