import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPublicSettings, updateSettings, generateHouseAdCopy } from "@/lib/settings.functions";
import { toast } from "sonner";
import { Sparkles, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/config")({
  component: Page,
});

const SLOTS = ["home_top", "home_hero", "home_middle", "home_sidebar", "article_top", "article_bottom"] as const;

const SLOT_INFO: Record<string, { label: string; size: string; hint: string }> = {
  home_top: { label: "Topo da home (banner)", size: "1600×180 px", hint: "Faixa horizontal acima do hero. Proporção ~9:1." },
  home_hero: { label: "Slide patrocinado no hero", size: "1600×900 px", hint: "Aparece como slide entre as notícias em destaque. Proporção 16:9." },
  home_middle: { label: "Meio da home", size: "1200×400 px", hint: "Bloco entre seções da home. Proporção ~3:1." },
  home_sidebar: { label: "Sidebar (quadrado)", size: "600×600 px", hint: "Quadrado MPU ao lado das notícias. Proporção 1:1." },
  article_top: { label: "Topo da matéria", size: "1200×300 px", hint: "Acima do corpo da matéria. Proporção 4:1." },
  article_bottom: { label: "Final da matéria", size: "1200×300 px", hint: "Abaixo do corpo da matéria. Proporção 4:1." },
};

function Page() {
  const fetchSettings = useServerFn(getPublicSettings);
  const update = useServerFn(updateSettings);
  const aiCopy = useServerFn(generateHouseAdCopy);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["public-settings"], queryFn: () => fetchSettings() });

  const [pubId, setPubId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [slots, setSlots] = useState<Record<string, { imageUrl?: string; linkUrl?: string; headline?: string; alt?: string }>>({});

  useEffect(() => {
    if (!data) return;
    setPubId(data.adsense.publisherId ?? "");
    setEnabled(!!data.adsense.enabled);
    setSlots(data.houseAds.slots ?? {});
  }, [data]);

  const saveAdsense = useMutation({
    mutationFn: () => update({ data: { key: "adsense", value: { publisherId: pubId.trim(), enabled } } }),
    onSuccess: () => { toast.success("AdSense atualizado"); qc.invalidateQueries({ queryKey: ["public-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveHouseAds = useMutation({
    mutationFn: () => update({ data: { key: "house_ads", value: { slots } } }),
    onSuccess: () => { toast.success("Publicidade salva"); qc.invalidateQueries({ queryKey: ["public-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateCopy = async (slot: string) => {
    const brief = prompt(`Brief curto do anunciante para o slot ${slot}:`);
    if (!brief) return;
    try {
      const r = await aiCopy({ data: { slot, brief } });
      setSlots((s) => ({ ...s, [slot]: { ...s[slot], headline: r.headline, alt: r.support } }));
      toast.success("Texto gerado pela IA");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">Configurações</h1>
      <p className="text-sm text-muted-foreground">Google AdSense e publicidade interna editável pela IA.</p>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>}

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold text-primary">Google AdSense</h2>
        <p className="text-xs text-muted-foreground">Quando ativado e sem peça interna, o slot serve um anúncio do Google.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Publisher ID</span>
            <input value={pubId} onChange={(e) => setPubId(e.target.value)} placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Ativo
          </label>
        </div>
        <button onClick={() => saveAdsense.mutate()} disabled={saveAdsense.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <Save className="h-4 w-4" /> Salvar AdSense
        </button>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-primary">Publicidade interna</h2>
            <p className="text-xs text-muted-foreground">Sobrescreve o AdSense quando preenchido. Use IA para texto.</p>
          </div>
          <button onClick={() => saveHouseAds.mutate()} disabled={saveHouseAds.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" /> Salvar tudo
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {SLOTS.map((slot) => {
            const s = slots[slot] ?? {};
            const set = (patch: Partial<typeof s>) => setSlots((all) => ({ ...all, [slot]: { ...all[slot], ...patch } }));
            const info = SLOT_INFO[slot];
            return (
              <div key={slot} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-primary">{info?.label ?? slot}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground">{info?.size}</span> · {info?.hint}
                    </p>
                  </div>
                  <button onClick={() => generateCopy(slot)} className="inline-flex items-center gap-1 rounded-md bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground hover:bg-accent/30">
                    <Sparkles className="h-3 w-3" /> Gerar com IA
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input value={s.imageUrl ?? ""} onChange={(e) => set({ imageUrl: e.target.value })} placeholder={`URL da imagem (${info?.size ?? ""})`}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  <input value={s.linkUrl ?? ""} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="Link de destino"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  <input value={s.headline ?? ""} onChange={(e) => set({ headline: e.target.value })} placeholder="Manchete"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
                  <input value={s.alt ?? ""} onChange={(e) => set({ alt: e.target.value })} placeholder="Texto alternativo / apoio"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}