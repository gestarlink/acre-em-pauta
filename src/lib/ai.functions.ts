import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function parseRss(xml: string, limit = 8): { title: string; link: string; summary: string; image?: string }[] {
  const items: { title: string; link: string; summary: string; image?: string }[] = [];
  const re = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(re) ?? [];
  for (const block of matches.slice(0, limit)) {
    const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ""));
    const link = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? ""));
    const description =
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ??
      block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1] ??
      "";
    const summary = decodeEntities(description).slice(0, 500);
    const image =
      block.match(/<media:content[^>]+url="([^"]+)"/i)?.[1] ??
      block.match(/<enclosure[^>]+url="([^"]+)"/i)?.[1] ??
      description.match(/<img[^>]+src="([^"]+)"/i)?.[1];
    if (title && link) items.push({ title, link, summary, image });
  }
  return items;
}

async function callAI(body: Record<string, unknown>) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY ausente");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (res.status === 429) throw new Error("Limite de uso atingido. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos esgotados. Adicione créditos em Settings > Workspace > Usage.");
  if (!res.ok) throw new Error(`Erro IA (${res.status})`);
  return res.json();
}

/** Gera uma imagem via Lovable AI Gateway e devolve um data URL (PNG base64). */
async function generateImageDataUrl(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const url: string | undefined =
      json?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
      json?.choices?.[0]?.message?.images?.[0]?.url;
    return url ?? null;
  } catch {
    return null;
  }
}

/** Faz upload de um data URL para o bucket social-media e devolve a URL pública. */
async function uploadDataUrl(dataUrl: string, folder: string, ext = "png"): Promise<string | null> {
  try {
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return null;
    const mime = m[1];
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("social-media")
      .upload(path, bin, { contentType: mime, upsert: false });
    if (error) return null;
    return supabaseAdmin.storage.from("social-media").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

function extractTool(json: any, name: string) {
  const call = json?.choices?.[0]?.message?.tool_calls?.find((c: any) => c.function?.name === name);
  if (!call) throw new Error("Resposta IA inválida");
  return JSON.parse(call.function.arguments);
}

/* ----------------------------- analyzeNews ----------------------------- */
export const analyzeNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { queueItemId: string }) => z.object({ queueItemId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: item } = await supabaseAdmin.from("ai_news_queue").select("*").eq("id", data.queueItemId).single();
    if (!item) throw new Error("Item não encontrado");
    const { data: cats } = await supabaseAdmin.from("categories").select("slug,name");

    const json = await callAI({
      messages: [
        { role: "system", content: "Você é um editor-chefe regional do Acre. Avalie a notícia segundo critérios jornalísticos rigorosos. Responda sempre em português." },
        { role: "user", content: `Notícia:\nTítulo: ${item.original_title}\nResumo: ${item.original_summary ?? ""}\nFonte: ${item.source_name ?? ""}\nCategorias disponíveis: ${(cats ?? []).map((c) => c.slug).join(", ")}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "analyze",
          description: "Análise editorial estruturada",
          parameters: {
            type: "object",
            properties: {
              local_relevance: { type: "integer", minimum: 0, maximum: 100, description: "Relevância para o Acre" },
              engagement_potential: { type: "integer", minimum: 0, maximum: 100 },
              public_importance: { type: "integer", minimum: 0, maximum: 100 },
              urgency: { type: "integer", minimum: 0, maximum: 100 },
              fake_news_risk: { type: "integer", minimum: 0, maximum: 100 },
              sensationalism: { type: "integer", minimum: 0, maximum: 100 },
              suggested_category: { type: "string", description: "slug" },
              social_potential: { type: "boolean" },
              reasoning: { type: "string", description: "Parecer editorial breve" },
            },
            required: ["local_relevance", "engagement_potential", "public_importance", "urgency", "fake_news_risk", "sensationalism", "suggested_category", "social_potential", "reasoning"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "analyze" } },
    });
    const result = extractTool(json, "analyze");

    await supabaseAdmin.from("ai_analysis").insert({
      queue_item_id: data.queueItemId,
      ...result,
      raw_response: json,
    });
    await supabaseAdmin.from("ai_news_queue").update({
      status: "analisado",
      relevance_score: result.local_relevance,
      urgency_score: result.urgency,
    }).eq("id", data.queueItemId);

    return result;
  });

/* ----------------------------- rewriteNews ----------------------------- */
export const rewriteNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { queueItemId: string }) => z.object({ queueItemId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: item } = await supabaseAdmin.from("ai_news_queue").select("*").eq("id", data.queueItemId).single();
    if (!item) throw new Error("Item não encontrado");

    const json = await callAI({
      messages: [
        { role: "system", content: "Você é redator-chefe do portal Acre em Pauta. Reescreva a notícia em estilo jornalístico claro, sem sensacionalismo, com foco regional acreano. Português brasileiro." },
        { role: "user", content: `Reescreva esta notícia para publicação:\nTítulo: ${item.original_title}\nResumo: ${item.original_summary ?? ""}\nURL fonte: ${item.original_url ?? ""}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "rewrite",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Título jornalístico, até 90 chars" },
              subtitle: { type: "string", description: "Linha-fina, até 160 chars" },
              slug: { type: "string", description: "kebab-case" },
              excerpt: { type: "string", description: "Resumo de 2 frases" },
              body: { type: "string", description: "Corpo em parágrafos, 3-6 parágrafos" },
              tags: { type: "array", items: { type: "string" } },
              meta_title: { type: "string" },
              meta_description: { type: "string", description: "máx 160 chars" },
              whatsapp_text: { type: "string", description: "Chamada curta com emoji" },
              instagram_caption: { type: "string" },
              telegram_text: { type: "string" },
              card_headline: { type: "string", description: "Manchete para card 1080x1080" },
            },
            required: ["title", "subtitle", "slug", "excerpt", "body", "tags", "meta_title", "meta_description", "whatsapp_text", "instagram_caption", "telegram_text", "card_headline"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "rewrite" } },
    });
    const r = extractTool(json, "rewrite");

    const { data: saved } = await supabaseAdmin.from("generated_rewrites").insert({
      queue_item_id: data.queueItemId,
      ...r,
      raw_response: json,
    }).select().single();

    await supabaseAdmin.from("ai_news_queue").update({ status: "reescrito" }).eq("id", data.queueItemId);
    return saved ?? r;
  });

/* --------------------------- publishFromRewrite ------------------------ */
export const publishFromRewrite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rewriteId: string; categorySlug?: string }) =>
    z.object({ rewriteId: z.string().uuid(), categorySlug: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: r } = await supabaseAdmin.from("generated_rewrites").select("*, ai_news_queue!inner(suggested_category_id, source_id, source_name, original_url)").eq("id", data.rewriteId).single();
    if (!r) throw new Error("Reescrita não encontrada");
    const queue = (r as any).ai_news_queue;

    let categoryId = queue?.suggested_category_id ?? null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin.from("categories").select("id").eq("slug", data.categorySlug).single();
      categoryId = c?.id ?? categoryId;
    }

    // Capa: tenta usar a imagem original; se não houver, gera uma com IA.
    const { data: queueRow } = await supabaseAdmin
      .from("ai_news_queue")
      .select("original_image_url")
      .eq("id", (r as any).queue_item_id)
      .maybeSingle();
    let coverUrl: string | null = queueRow?.original_image_url ?? null;
    if (!coverUrl) {
      const prompt = `Capa fotojornalística realista para notícia sobre: ${r.title}. ${r.subtitle ?? ""}. Estilo editorial, sem texto, sem marca d'água, alta qualidade, formato 16:9.`;
      const dataUrl = await generateImageDataUrl(prompt);
      if (dataUrl) coverUrl = await uploadDataUrl(dataUrl, "covers");
    }

    const { data: post, error } = await supabaseAdmin.from("posts").insert({
      title: r.title!,
      subtitle: r.subtitle,
      slug: r.slug!,
      excerpt: r.excerpt,
      body: r.body!,
      tags: r.tags,
      meta_title: r.meta_title,
      meta_description: r.meta_description,
      category_id: categoryId,
      source_id: queue?.source_id ?? null,
      source_url: queue?.original_url ?? null,
      cover_image_url: coverUrl,
      author_id: context.userId,
      author_name: "Redação Acre em Pauta",
      status: "publicado",
      published_at: new Date().toISOString(),
    }).select().single();
    if (error) throw new Error(error.message);

    // Atualiza status da fila para "publicado"
    if ((r as any).queue_item_id) {
      await supabaseAdmin.from("ai_news_queue").update({ status: "publicado" }).eq("id", (r as any).queue_item_id);
    }

    return { postId: post?.id };
  });

/* --------------------------- generateSocialPost ------------------------ */
export const generateSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { postId: string; format: "card" | "story" | "reels" | "plantao" | "urgente" }) =>
    z.object({ postId: z.string().uuid(), format: z.enum(["card", "story", "reels", "plantao", "urgente"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: post } = await supabaseAdmin.from("posts").select("title,subtitle,excerpt").eq("id", data.postId).single();
    if (!post) throw new Error("Post não encontrado");

    const json = await callAI({
      messages: [
        { role: "system", content: "Você cria conteúdo para redes sociais do Acre em Pauta. Tom direto, regional, sem clickbait." },
        { role: "user", content: `Crie peça ${data.format} para:\nTítulo: ${post.title}\nLinha-fina: ${post.subtitle ?? ""}\nResumo: ${post.excerpt ?? ""}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "social",
          parameters: {
            type: "object",
            properties: {
              headline: { type: "string", description: "Texto principal do card" },
              body_text: { type: "string", description: "Texto secundário" },
              caption: { type: "string", description: "Legenda para postagem" },
              cta: { type: "string" },
              variant: { type: "string", description: "ex: padrão/breaking/urgente" },
            },
            required: ["headline", "body_text", "caption", "cta", "variant"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "social" } },
    });
    const r = extractTool(json, "social");

    // Gera mídia visual conforme o formato.
    const visualBrief = `${r.headline}. ${r.body_text ?? ""}`.slice(0, 400);
    let aspect = "quadrada 1:1";
    if (data.format === "story" || data.format === "reels") aspect = "vertical 9:16";
    const isUrgent = data.format === "plantao" || data.format === "urgente" || r.variant?.toLowerCase?.().includes("urgente");
    const tone = isUrgent
      ? "tarja vermelha 'URGENTE' no topo, tipografia bold impactante"
      : "design editorial clean com identidade verde-floresta do Acre em Pauta";
    const imgPrompt = `Card de notícia para redes sociais, formato ${aspect}, ${tone}. Tema: ${visualBrief}. Inclua a manchete "${r.headline}" como texto principal legível, sem marca d'água, sem logos terceiros, estilo fotojornalístico profissional.`;

    const dataUrl = await generateImageDataUrl(imgPrompt);
    const imageUrl = dataUrl ? await uploadDataUrl(dataUrl, `social/${data.format}`) : null;

    const { data: saved } = await supabaseAdmin.from("generated_social_posts").insert({
      post_id: data.postId,
      format: data.format,
      ...r,
      image_url: imageUrl,
      image_prompt: imgPrompt,
      video_url: null,
    }).select().single();
    return saved ?? r;
  });

/* --------------------------- generateVideoScript ----------------------- */
export const generateVideoScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { postId: string }) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: post } = await supabaseAdmin.from("posts").select("title,subtitle,body,excerpt").eq("id", data.postId).single();
    if (!post) throw new Error("Post não encontrado");

    const json = await callAI({
      messages: [
        { role: "system", content: "Você é roteirista para vídeos curtos (60s) de notícias regionais do Acre. Linguagem clara, dinâmica, sem sensacionalismo." },
        { role: "user", content: `Crie roteiro de vídeo curto a partir desta notícia:\n${post.title}\n${post.subtitle ?? ""}\n${post.excerpt ?? ""}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "video",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              narration: { type: "string", description: "Texto contínuo de até 150 palavras" },
              caption: { type: "string", description: "Legenda do post" },
              cover_suggestion: { type: "string", description: "Descrição visual da capa" },
              scenes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    n: { type: "integer" },
                    visual: { type: "string" },
                    text: { type: "string" },
                    seconds: { type: "integer" },
                  },
                  required: ["n", "visual", "text", "seconds"],
                },
              },
            },
            required: ["title", "narration", "caption", "cover_suggestion", "scenes"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "video" } },
    });
    const r = extractTool(json, "video");

    const { data: saved } = await supabaseAdmin.from("generated_video_scripts").insert({
      post_id: data.postId,
      ...r,
    }).select().single();
    return saved ?? r;
  });

/* --------------------------- generateInstagramCopy ---------------------- */
/** Gera apenas textos (headline curta, legenda, hashtags, stories, whatsapp).
 *  A arte do card é renderizada no cliente via Canvas e baixada como PNG. */
export const generateInstagramCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { postId: string; categorySlug?: string }) =>
    z.object({ postId: z.string().uuid(), categorySlug: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("title,subtitle,excerpt,slug")
      .eq("id", data.postId)
      .single();
    if (!post) throw new Error("Post não encontrado");

    const json = await callAI({
      messages: [
        { role: "system", content: "Você é editor social do Acre em Pauta. Tom direto, regional, jornalístico, sem clickbait nem sensacionalismo. Português brasileiro." },
        { role: "user", content: `Gere conteúdo para Instagram a partir desta notícia:\nTítulo: ${post.title}\nLinha-fina: ${post.subtitle ?? ""}\nResumo: ${post.excerpt ?? ""}\nCategoria: ${data.categorySlug ?? "—"}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "ig",
          parameters: {
            type: "object",
            properties: {
              short_headline: { type: "string", description: "Manchete impactante para o card do Instagram, MÁXIMO 90 caracteres, sem clickbait, com responsabilidade jornalística." },
              caption: { type: "string", description: "Legenda completa do post (2 a 4 parágrafos curtos, com emojis sutis se apropriado)." },
              hashtags: { type: "array", items: { type: "string" }, description: "8 a 15 hashtags relevantes, sem # no começo." },
              stories_text: { type: "string", description: "Chamada curta (até 120 chars) para colar no Stories." },
              whatsapp_text: { type: "string", description: "Texto curto (até 220 chars) para divulgar no WhatsApp, com emoji de notícia." },
            },
            required: ["short_headline", "caption", "hashtags", "stories_text", "whatsapp_text"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "ig" } },
    });
    const r = extractTool(json, "ig");
    // Garante limite de 90 chars na headline.
    if (typeof r.short_headline === "string" && r.short_headline.length > 90) {
      r.short_headline = r.short_headline.slice(0, 87).trimEnd() + "…";
    }
    return r as {
      short_headline: string;
      caption: string;
      hashtags: string[];
      stories_text: string;
      whatsapp_text: string;
    };
  });

/* --------------------------- autoPublish ----------------------------- */
/** Busca RSS, analisa, reescreve e publica automaticamente.
 *  Só publica itens com relevância local >= MIN_RELEVANCE. */
export const autoPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { minRelevance?: number }) =>
    z.object({ minRelevance: z.number().int().min(0).max(100).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const MIN_RELEVANCE = data.minRelevance ?? 70;

    // 1. Buscar RSS
    const { data: sources } = await supabaseAdmin
      .from("sources")
      .select("id,name,url,category_id,source_type,active")
      .eq("active", true);
    if (!sources || sources.length === 0) return { fetched: 0, published: 0, skipped: 0, errors: ["Nenhuma fonte ativa"] };

    const inserts: Record<string, unknown>[] = [];
    const errors: string[] = [];

    await Promise.all(
      sources.map(async (src) => {
        try {
          const res = await fetch(src.url, {
            headers: { "User-Agent": "AcreEmPautaBot/1.0 (+https://acreempauta.lovable.app)" },
            signal: AbortSignal.timeout(12_000),
          });
          if (!res.ok) { errors.push(`${src.name}: HTTP ${res.status}`); return; }
          const xml = await res.text();
          const items = parseRss(xml, 6);
          for (const it of items) {
            inserts.push({
              source_id: src.id,
              source_name: src.name,
              original_title: it.title.slice(0, 500),
              original_summary: it.summary,
              original_url: it.link,
              original_image_url: it.image ?? null,
              suggested_category_id: src.category_id,
              status: "novo" as const,
            });
          }
        } catch (e) {
          errors.push(`${src.name}: ${e instanceof Error ? e.message : "erro"}`);
        }
      }),
    );

    if (inserts.length === 0) return { fetched: 0, published: 0, skipped: 0, errors };

    // Dedupe
    const urls = inserts.map((i) => i.original_url as string);
    const { data: existing } = await supabaseAdmin
      .from("ai_news_queue")
      .select("original_url")
      .in("original_url", urls);
    const seen = new Set((existing ?? []).map((r) => r.original_url));
    const fresh = inserts.filter((i) => !seen.has(i.original_url as string));
    if (fresh.length === 0) return { fetched: 0, published: 0, skipped: 0, errors, message: "Nada novo" };

    const { error: insertErr } = await supabaseAdmin.from("ai_news_queue").insert(fresh as never);
    if (insertErr) throw new Error(insertErr.message);

    await supabaseAdmin
      .from("sources")
      .update({ last_fetched_at: new Date().toISOString() })
      .in("id", sources.map((s) => s.id));

    // 2. Buscar itens inseridos (novo)
    const { data: queueItems } = await supabaseAdmin
      .from("ai_news_queue")
      .select("*")
      .eq("status", "novo")
      .in("original_url", urls)
      .order("created_at", { ascending: false });

    if (!queueItems || queueItems.length === 0) return { fetched: fresh.length, published: 0, skipped: 0, errors };

    // 3. Analisar + Reescrever + Publicar cada item
    let published = 0;
    let skipped = 0;
    const { data: cats } = await supabaseAdmin.from("categories").select("slug,name");

    for (const item of queueItems) {
      try {
        // Análise IA
        const analyzeJson = await callAI({
          messages: [
            { role: "system", content: "Você é um editor-chefe regional do Acre. Avalie a notícia segundo critérios jornalísticos rigorosos. Responda sempre em português." },
            { role: "user", content: `Notícia:\nTítulo: ${item.original_title}\nResumo: ${item.original_summary ?? ""}\nFonte: ${item.source_name ?? ""}\nCategorias disponíveis: ${(cats ?? []).map((c) => c.slug).join(", ")}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "analyze",
              description: "Análise editorial estruturada",
              parameters: {
                type: "object",
                properties: {
                  local_relevance: { type: "integer", minimum: 0, maximum: 100 },
                  engagement_potential: { type: "integer", minimum: 0, maximum: 100 },
                  public_importance: { type: "integer", minimum: 0, maximum: 100 },
                  urgency: { type: "integer", minimum: 0, maximum: 100 },
                  fake_news_risk: { type: "integer", minimum: 0, maximum: 100 },
                  sensationalism: { type: "integer", minimum: 0, maximum: 100 },
                  suggested_category: { type: "string" },
                  social_potential: { type: "boolean" },
                  reasoning: { type: "string" },
                },
                required: ["local_relevance", "engagement_potential", "public_importance", "urgency", "fake_news_risk", "sensationalism", "suggested_category", "social_potential", "reasoning"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "analyze" } },
        });
        const analysis = extractTool(analyzeJson, "analyze");

        await supabaseAdmin.from("ai_analysis").insert({
          queue_item_id: item.id,
          ...analysis,
          raw_response: analyzeJson,
        });
        await supabaseAdmin.from("ai_news_queue").update({
          status: "analisado",
          relevance_score: analysis.local_relevance,
          urgency_score: analysis.urgency,
        }).eq("id", item.id);

        // Filtrar por relevância
        if (analysis.local_relevance < MIN_RELEVANCE) {
          skipped++;
          continue;
        }

        // Reescrita IA
        const rewriteJson = await callAI({
          messages: [
            { role: "system", content: "Você é redator-chefe do portal Acre em Pauta. Reescreva a notícia em estilo jornalístico claro, sem sensacionalismo, com foco regional acreano. Português brasileiro." },
            { role: "user", content: `Reescreva esta notícia para publicação:\nTítulo: ${item.original_title}\nResumo: ${item.original_summary ?? ""}\nURL fonte: ${item.original_url ?? ""}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "rewrite",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Título jornalístico, até 90 chars" },
                  subtitle: { type: "string", description: "Linha-fina, até 160 chars" },
                  slug: { type: "string", description: "kebab-case" },
                  excerpt: { type: "string", description: "Resumo de 2 frases" },
                  body: { type: "string", description: "Corpo em parágrafos, 3-6 parágrafos" },
                  tags: { type: "array", items: { type: "string" } },
                  meta_title: { type: "string" },
                  meta_description: { type: "string", description: "máx 160 chars" },
                  whatsapp_text: { type: "string", description: "Chamada curta com emoji" },
                  instagram_caption: { type: "string" },
                  telegram_text: { type: "string" },
                  card_headline: { type: "string", description: "Manchete para card 1080x1080" },
                },
                required: ["title", "subtitle", "slug", "excerpt", "body", "tags", "meta_title", "meta_description", "whatsapp_text", "instagram_caption", "telegram_text", "card_headline"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "rewrite" } },
        });
        const rw = extractTool(rewriteJson, "rewrite");

        const { data: savedRewrite } = await supabaseAdmin.from("generated_rewrites").insert({
          queue_item_id: item.id,
          ...rw,
          raw_response: rewriteJson,
        }).select().single();

        await supabaseAdmin.from("ai_news_queue").update({ status: "reescrito" }).eq("id", item.id);

        // Publicar
        let categoryId = item.suggested_category_id ?? null;
        let coverUrl: string | null = item.original_image_url ?? null;
        if (!coverUrl) {
          const prompt = `Capa fotojornalística realista para notícia sobre: ${rw.title}. ${rw.subtitle ?? ""}. Estilo editorial, sem texto, sem marca d'água, alta qualidade, formato 16:9.`;
          const dataUrl = await generateImageDataUrl(prompt);
          if (dataUrl) coverUrl = await uploadDataUrl(dataUrl, "covers");
        }

        const { data: post, error: postErr } = await supabaseAdmin.from("posts").insert({
          title: rw.title!,
          subtitle: rw.subtitle,
          slug: rw.slug!,
          excerpt: rw.excerpt,
          body: rw.body!,
          tags: rw.tags,
          meta_title: rw.meta_title,
          meta_description: rw.meta_description,
          category_id: categoryId,
          source_id: item.source_id ?? null,
          source_url: item.original_url ?? null,
          cover_image_url: coverUrl,
          author_id: context.userId,
          author_name: "Redação Acre em Pauta",
          status: "publicado",
          published_at: new Date().toISOString(),
        }).select().single();

        if (postErr) {
          errors.push(`${item.original_title}: ${postErr.message}`);
          continue;
        }

        await supabaseAdmin.from("ai_news_queue").update({ status: "publicado" }).eq("id", item.id);
        published++;
      } catch (e) {
        errors.push(`${item.original_title}: ${e instanceof Error ? e.message : "erro"}`);
      }
    }

    return { fetched: fresh.length, published, skipped, errors };
  });