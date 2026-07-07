import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AdsenseValue = { publisherId: string; enabled: boolean };
type HouseAdSlot = { imageUrl?: string; imageUrlMobile?: string; linkUrl?: string; alt?: string; headline?: string; html?: string };
type HouseAdsValue = { slots: Record<string, HouseAdSlot> };
type FallbackAd = { imageUrl: string; headline: string; support: string; cta: string; createdAt: string };
type FallbackAdsValue = { slots: Record<string, FallbackAd> };

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data }, { data: ads }] = await Promise.all([
    supabaseAdmin.from("settings").select("key,value").in("key", ["adsense", "house_ads", "fallback_ads"]),
    supabaseAdmin.from("ads").select("placement,image_url,image_url_mobile,link_url,name").eq("active", true),
  ]);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
  const adsense = (map.adsense as AdsenseValue) ?? { publisherId: "", enabled: false };
  const houseAds = (map.house_ads as HouseAdsValue) ?? { slots: {} };
  const fallbackAds = (map.fallback_ads as FallbackAdsValue) ?? { slots: {} };
  // Mescla anúncios da tabela `ads` (uma campanha por slot — primeira ativa vence)
  // dentro do mesmo formato de houseAds.slots para o AdSlot consumir.
  const merged: HouseAdsValue = { slots: { ...houseAds.slots } };
  for (const a of ads ?? []) {
    if (!a.placement || !a.image_url) continue;
    if (!merged.slots[a.placement]) {
      merged.slots[a.placement] = {
        imageUrl: a.image_url,
        imageUrlMobile: (a as { image_url_mobile?: string | null }).image_url_mobile ?? undefined,
        linkUrl: a.link_url ?? undefined,
        alt: a.name ?? undefined,
      };
    }
  }
  return { adsense, houseAds: merged, fallbackAds };
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: "adsense" | "house_ads"; value: unknown }) =>
    z.object({
      key: z.enum(["adsense", "house_ads"]),
      value: z.unknown(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: data.key, value: data.value as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------- Fallback "Anuncie aqui" ------------------------ */
/**
 * Devolve (e gera, se necessário) um banner publicitário criado pela IA
 * para o caso de não haver anunciante pago naquele slot.
 * Cacheado no settings key `fallback_ads` por (slot+variant).
 */
export const getFallbackAd = createServerFn({ method: "POST" })
  .inputValidator((d: { slot: string; variant?: "banner" | "square" | "inline" | "native" }) =>
    z.object({
      slot: z.string().min(1).max(60),
      variant: z.enum(["banner", "square", "inline", "native"]).default("banner"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    // bump version to invalidate previously cached banners
    const cacheKey = `${data.slot}__${data.variant}__v3`;
    const { data: row } = await supabaseAdmin.from("settings").select("value").eq("key", "fallback_ads").maybeSingle();
    const current = ((row?.value as FallbackAdsValue) ?? { slots: {} });
    const cached = current.slots?.[cacheKey];
    if (cached?.imageUrl) return cached;

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY ausente");

    const ratio =
      data.variant === "square" ? "quadrado 1:1" :
      data.variant === "native" ? "16:9 horizontal cinematográfico" :
      "banner horizontal 16:5";

    const imgPrompt = `Peça publicitária ${ratio} para o portal de notícias "ACRE EM PAUTA".
Composição totalmente flat com fundo sólido em verde-escuro #0F3D2E (cor primária do portal) levemente gradiente para verde mais profundo, com sutis raios de luz amarelo-âmbar #F2B233.
Inclua a wordmark "ACRE EM PAUTA" em tipografia sans-serif bold branca, bem desenhada e legível, posicionada com elegância (não centralizada, estilo editorial).
Elementos gráficos abstratos minimalistas remetendo ao Acre: silhuetas de folhas amazônicas em verde-claro translúcido, traços geométricos suaves em amarelo-âmbar.
REGRAS CRÍTICAS:
- NÃO desenhe nenhuma caixa, retângulo, badge ou faixa colorida atrás de texto.
- NÃO inclua textos longos, slogans ou frases extras na imagem — apenas a wordmark "ACRE EM PAUTA".
- Deixe ~55% da composição como área limpa (lado direito) para sobreposição de copy publicitário pelo HTML.
- Sem watermark, sem moldura, sem bordas, sem ruído fotográfico.
- Estilo Awwwards, premium, editorial, contemporâneo.`;
    let imageUrl: string | null = null;
    try {
      const imgRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash-image",
          messages: [{ role: "user", content: imgPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (imgRes.ok) {
        const j = await imgRes.json();
        const dataUrl: string | undefined =
          j?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
          j?.choices?.[0]?.message?.images?.[0]?.url;
        if (dataUrl?.startsWith("data:")) {
          const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (m) {
            const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
            const path = `fallback-ads/${cacheKey}-${Date.now()}.png`;
            const up = await supabaseAdmin.storage.from("social-media").upload(path, bin, { contentType: m[1], upsert: true });
            if (!up.error) {
              imageUrl = supabaseAdmin.storage.from("social-media").getPublicUrl(path).data.publicUrl;
            }
          }
        }
      }
    } catch { /* ignore */ }

    let headline = "Seu negócio em destaque no Acre";
    let support = "Milhares de leitores acompanham o Acre em Pauta todos os dias.";
    let cta = "Anuncie aqui";
    try {
      const txt = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é copywriter publicitário brasileiro. Tom direto, criativo, sem clickbait." },
            { role: "user", content: `Crie um anúncio convidando empresários do Acre a anunciarem no portal "Acre em Pauta".\nFormato do slot: ${data.variant} (${data.slot}).\nDevolva exatamente 3 linhas, separadas por |:\n1) Manchete curta e impactante (máx 60 caracteres)\n2) Linha de apoio com benefício claro (máx 110 caracteres)\n3) CTA curto (máx 22 caracteres, verbo no imperativo)\nNada além disso.` },
          ],
        }),
      });
      if (txt.ok) {
        const j = await txt.json();
        const t: string = j?.choices?.[0]?.message?.content ?? "";
        const parts = t.split("|").map((s) => s.trim()).filter(Boolean);
        if (parts[0]) headline = parts[0].slice(0, 80);
        if (parts[1]) support = parts[1].slice(0, 140);
        if (parts[2]) cta = parts[2].slice(0, 30);
      }
    } catch { /* keep defaults */ }

    const fallback: FallbackAd = {
      imageUrl: imageUrl ?? "",
      headline, support, cta,
      createdAt: new Date().toISOString(),
    };
    const next: FallbackAdsValue = { slots: { ...current.slots, [cacheKey]: fallback } };
    await supabaseAdmin.from("settings").upsert({ key: "fallback_ads", value: next as never, updated_at: new Date().toISOString() });
    return fallback;
  });

export const generateHouseAdCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slot: string; brief: string }) =>
    z.object({ slot: z.string().min(1).max(60), brief: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY ausente");
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você cria peças de publicidade para um portal regional do Acre. Tom direto, brasileiro, sem clickbait." },
          { role: "user", content: `Slot: ${data.slot}\nBrief do anunciante: ${data.brief}\nDevolva apenas uma manchete curta (máx 90 caracteres) seguida de uma linha de apoio (máx 140 caracteres), separadas por |.` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Limite de uso atingido");
    if (res.status === 402) throw new Error("Créditos esgotados");
    if (!res.ok) throw new Error(`Erro IA (${res.status})`);
    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const [headline = "", support = ""] = text.split("|").map((s) => s.trim());
    return { headline, support };
  });