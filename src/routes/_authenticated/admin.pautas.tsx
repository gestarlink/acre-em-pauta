import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTips, updateTipStatus } from "@/lib/admin.functions";
import { toast } from "sonner";

const q = queryOptions({ queryKey: ["admin", "tips"], queryFn: () => listTips() });

export const Route = createFileRoute("/_authenticated/admin/pautas")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(q);
  const qc = useQueryClient();
  const upd = useServerFn(updateTipStatus);
  const m = useMutation({
    mutationFn: (v: { id: string; status: string }) => upd({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "tips"] }); toast.success("Atualizado"); },
  });

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">Pautas recebidas</h1>
      <p className="text-sm text-muted-foreground">Sugestões enviadas pelos leitores via formulário público.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {data.tips.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.city ?? "—"} {t.neighborhood ? `· ${t.neighborhood}` : ""} · {t.status}</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-foreground">{t.name}</h3>
            <p className="mt-2 text-sm text-foreground">{t.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t.email ?? ""} {t.whatsapp ? `· ${t.whatsapp}` : ""}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => m.mutate({ id: t.id, status: "aprovada" })} className="rounded-md bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90">Aprovar</button>
              <button onClick={() => m.mutate({ id: t.id, status: "descartada" })} className="rounded-md border border-border px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-muted">Descartar</button>
            </div>
          </article>
        ))}
        {data.tips.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pauta recebida ainda.</p>}
      </div>
    </div>
  );
}