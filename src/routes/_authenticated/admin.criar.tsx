import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQuery } from "@tanstack/react-query";
import { upsertPost, listCategories, getPostForEdit } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { z } from "zod";

const catsQ = queryOptions({ queryKey: ["admin", "cats"], queryFn: () => listCategories() });

export const Route = createFileRoute("/_authenticated/admin/criar")({
  validateSearch: z.object({ id: z.string().uuid().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catsQ),
  component: Page,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function Page() {
  const { data: cats } = useSuspenseQuery(catsQ);
  const { id: editId } = Route.useSearch();
  const nav = useNavigate();
  const up = useServerFn(upsertPost);
  const getPost = useServerFn(getPostForEdit);
  const [form, setForm] = useState({
    id: "" as string | undefined, title: "", slug: "", subtitle: "", excerpt: "", body: "",
    category_id: "", is_featured: false, is_breaking: false,
    status: "rascunho" as "rascunho" | "publicado", cover_image_url: "",
  });

  const { data: existing } = useQuery({
    queryKey: ["admin", "post", editId],
    queryFn: () => getPost({ data: { id: editId! } }),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existing?.post) {
      const p = existing.post as any;
      setForm({
        id: p.id,
        title: p.title ?? "",
        slug: p.slug ?? "",
        subtitle: p.subtitle ?? "",
        excerpt: p.excerpt ?? "",
        body: p.body ?? "",
        category_id: p.category_id ?? "",
        is_featured: !!p.is_featured,
        is_breaking: !!p.is_breaking,
        status: (p.status === "publicado" ? "publicado" : "rascunho") as "rascunho" | "publicado",
        cover_image_url: p.cover_image_url ?? "",
      });
    }
  }, [existing]);

  const m = useMutation({
    mutationFn: (status: "rascunho" | "publicado") => up({ data: { ...form, id: form.id || undefined, status, slug: form.slug || slugify(form.title) } }),
    onSuccess: () => { toast.success("Notícia salva"); nav({ to: "/admin/noticias" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">{editId ? "Editar notícia" : "Criar notícia"}</h1>
      <p className="text-sm text-muted-foreground">{editId ? "Atualize título, corpo, capa e status." : "Editor manual — para notícias geradas pela IA use a Fila IA."}</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} placeholder="Título" className="w-full rounded-md border border-border bg-background px-3 py-2 text-lg font-display font-bold" />
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="slug-url" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Linha-fina" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Resumo (2 frases)" rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Corpo da notícia (markdown / texto)" rows={16} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
        </div>
        <aside className="space-y-3 rounded-xl border border-border bg-card p-5 h-fit">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">— escolher —</option>
              {cats.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Capa (URL)
            <input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Destaque</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_breaking} onChange={(e) => setForm({ ...form, is_breaking: e.target.checked })} /> Plantão</label>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => m.mutate("rascunho")} disabled={m.isPending || !form.title || form.body.length < 10} className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-bold uppercase hover:bg-muted disabled:opacity-50"><Save className="h-4 w-4" /> Rascunho</button>
            <button onClick={() => m.mutate("publicado")} disabled={m.isPending || !form.title || form.body.length < 10} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold uppercase text-primary-foreground hover:opacity-90 disabled:opacity-50"><Save className="h-4 w-4" /> Publicar</button>
          </div>
        </aside>
      </div>
    </div>
  );
}