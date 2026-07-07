import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAds, upsertAd, deleteAd, uploadImageToBucket } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ImageIcon, Check } from "lucide-react";

type SlotSpec = {
  id: string;
  label: string;
  where: string;
  recommended: string;
  ratio: string;
  variant: "banner" | "square" | "inline" | "native";
};

const SLOTS: SlotSpec[] = [
  { id: "home_hero",      label: "Home — Slide do topo (carrossel)", where: "Aparece dentro do slide principal da home", recommended: "1600 × 900 px (mobile: 1080 × 1350)", ratio: "16:9 / 4:5 mobile", variant: "banner" },
  { id: "home_top",       label: "Home — Topo",                where: "Acima da grade de notícias",        recommended: "1200 × 240 px",  ratio: "5:1",  variant: "banner" },
  { id: "home_infeed",    label: "Home — Entre notícias",      where: "No meio da lista da home",          recommended: "1200 × 240 px",  ratio: "5:1",  variant: "banner" },
  { id: "home_sidebar",   label: "Home — Lateral",             where: "Coluna lateral direita (desktop)",  recommended: "600 × 600 px",   ratio: "1:1",  variant: "square" },
  { id: "article_top",    label: "Notícia — Topo",             where: "Logo abaixo do título da matéria",  recommended: "1200 × 240 px",  ratio: "5:1",  variant: "banner" },
  { id: "article_mid",    label: "Notícia — Meio do texto",    where: "Entre parágrafos da matéria",       recommended: "1200 × 240 px",  ratio: "5:1",  variant: "banner" },
  { id: "article_bottom", label: "Notícia — Final",            where: "Após o corpo da matéria",           recommended: "1200 × 240 px",  ratio: "5:1",  variant: "banner" },
  { id: "plantao",        label: "Plantão",                    where: "Página de plantão / urgentes",      recommended: "1200 × 240 px",  ratio: "5:1",  variant: "banner" },
];

const q = queryOptions({ queryKey: ["admin", "ads"], queryFn: () => listAds() });

export const Route = createFileRoute("/_authenticated/admin/anuncios")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(q);
  const qc = useQueryClient();
  const up = useServerFn(upsertAd);
  const del = useServerFn(deleteAd);
  const upload = useServerFn(uploadImageToBucket);
  const [draft, setDraft] = useState({ name: "", placement: "home_top", image_url: "", image_url_mobile: "", link_url: "", active: true });
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);

  const currentSpec = SLOTS.find((s) => s.id === draft.placement) ?? SLOTS[0];
  const adsByPlacement = (data.ads ?? []).reduce<Record<string, typeof data.ads>>((acc, a) => {
    (acc[a.placement] ??= []).push(a);
    return acc;
  }, {});

  const create = useMutation({
    mutationFn: () => up({ data: draft }),
    onSuccess: () => { toast.success("Anúncio salvo"); setDraft({ name: "", placement: draft.placement, image_url: "", image_url_mobile: "", link_url: "", active: true }); qc.invalidateQueries({ queryKey: ["admin", "ads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["admin", "ads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = async (file: File, target: "desktop" | "mobile") => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem maior que 5MB"); return; }
    setUploading(target);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error("falha na leitura"));
        r.readAsDataURL(file);
      });
      const { url } = await upload({ data: { folder: "ads", filename: file.name, dataUrl } });
      setDraft((d) => target === "desktop" ? { ...d, image_url: url } : { ...d, image_url_mobile: url });
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">Anúncios</h1>
      <p className="text-sm text-muted-foreground">Faça upload da imagem certa para cada espaço. Cada slot tem um tamanho recomendado para ficar perfeito no portal.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* COLUNA ESQUERDA — formulário */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold text-primary">Novo anúncio</h2>

          <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Espaço (slot)</label>
          <select
            value={draft.placement}
            onChange={(e) => setDraft({ ...draft, placement: e.target.value })}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {SLOTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label} — {s.recommended}</option>
            ))}
          </select>

          <div className="mt-3 rounded-md border border-dashed border-accent/40 bg-accent/5 p-3 text-xs">
            <p><strong>Onde aparece:</strong> {currentSpec.where}</p>
            <p><strong>Tamanho ideal:</strong> {currentSpec.recommended} (proporção {currentSpec.ratio})</p>
            <p className="text-muted-foreground">Formatos aceitos: JPG, PNG ou WEBP até 5MB.</p>
          </div>

          <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nome da campanha</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Loja XYZ — junho/2026" className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />

          <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Imagem desktop ({currentSpec.recommended})</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm font-bold uppercase tracking-wider hover:bg-muted">
              {uploading === "desktop" ? "Enviando…" : (<><Upload className="h-4 w-4" /> Enviar desktop</>)}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, "desktop"); }} />
            </label>
            <input
              value={draft.image_url}
              onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
              placeholder="ou cole a URL"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs"
            />
          </div>
          {draft.image_url && (
            <div className="mt-2 overflow-hidden rounded-md border border-border">
              <img src={draft.image_url} alt="Prévia desktop" className="block max-h-48 w-full object-contain bg-muted" />
            </div>
          )}

          <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Imagem mobile (opcional · 1080 × 1080 ou 720 × 900)</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm font-bold uppercase tracking-wider hover:bg-muted">
              {uploading === "mobile" ? "Enviando…" : (<><Upload className="h-4 w-4" /> Enviar mobile</>)}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, "mobile"); }} />
            </label>
            <input
              value={draft.image_url_mobile}
              onChange={(e) => setDraft({ ...draft, image_url_mobile: e.target.value })}
              placeholder="ou cole a URL (se vazio usa a desktop)"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs"
            />
          </div>
          {draft.image_url_mobile && (
            <div className="mt-2 overflow-hidden rounded-md border border-border">
              <img src={draft.image_url_mobile} alt="Prévia mobile" className="mx-auto block max-h-64 object-contain bg-muted" />
            </div>
          )}

          <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Link de destino</label>
          <input value={draft.link_url} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} placeholder="https://site-do-anunciante.com" className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />

          <label className="mt-4 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Ativo
          </label>

          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !draft.name || !draft.image_url}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Salvar anúncio
          </button>
        </section>

        {/* COLUNA DIREITA — lista de slots e anúncios ativos */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-primary">Espaços do portal</h2>
          {SLOTS.map((s) => {
            const items = adsByPlacement[s.id] ?? [];
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-foreground">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.where}</p>
                    <p className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {s.recommended} · {s.ratio}
                    </p>
                  </div>
                  <button
                    onClick={() => setDraft({ name: "", placement: s.id, image_url: "", image_url_mobile: "", link_url: "", active: true })}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold uppercase tracking-wider hover:bg-muted"
                  >
                    <ImageIcon className="h-3 w-3" /> Adicionar
                  </button>
                </div>
                {items.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">Nenhum anúncio aqui ainda.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {items.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 rounded-md border border-border bg-background p-2">
                        {a.image_url && <img src={a.image_url} alt={a.name} className="h-12 w-20 shrink-0 rounded object-cover" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{a.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{a.link_url || "sem link"}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${a.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {a.active && <Check className="h-3 w-3" />} {a.active ? "Ativo" : "Pausado"}
                        </span>
                        <button onClick={() => { if (confirm(`Remover ${a.name}?`)) remove.mutate(a.id); }} className="inline-flex items-center rounded-md border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}