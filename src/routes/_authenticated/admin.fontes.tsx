import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSources, upsertSource } from "@/lib/admin.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const q = queryOptions({ queryKey: ["admin", "sources"], queryFn: () => listSources() });

export const Route = createFileRoute("/_authenticated/admin/fontes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(q);
  const qc = useQueryClient();
  const fn = useServerFn(upsertSource);
  const [form, setForm] = useState({ name: "", url: "", source_type: "rss", credibility: 80, active: true });

  const m = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "sources"] }); toast.success("Fonte salva"); setForm({ name: "", url: "", source_type: "rss", credibility: 80, active: true }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">Fontes</h1>
      <p className="text-sm text-muted-foreground">Cadastre fontes confiáveis para a captação automática.</p>

      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-6">
        <input className="md:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Nome" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="md:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="URL" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })}>
          <option value="rss">RSS</option><option value="site">Site</option><option value="blog">Blog</option><option value="oficial">Oficial</option><option value="portal">Portal</option>
        </select>
        <button disabled={m.isPending} className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">URL</th><th className="px-4 py-3">Cred.</th><th className="px-4 py-3">Ativo</th></tr>
          </thead>
          <tbody>
            {data.sources.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.source_type}</td>
                <td className="px-4 py-3 text-muted-foreground truncate max-w-xs"><a href={s.url} target="_blank" rel="noreferrer" className="hover:text-primary">{s.url}</a></td>
                <td className="px-4 py-3">{s.credibility}</td>
                <td className="px-4 py-3">{s.active ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}