import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

function parseRss(xml: string, limit = 6) {
  const items: { title: string; link: string; summary: string; image?: string }[] = [];
  const matches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of matches.slice(0, limit)) {
    const title = decodeEntities(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const link = decodeEntities(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? "");
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

export const Route = createFileRoute("/api/public/hooks/fetch-rss")({
  server: {
    handlers: {
      POST: async () => {
        const { data: sources } = await supabaseAdmin
          .from("sources")
          .select("id,name,url,category_id,active")
          .eq("active", true);
        if (!sources?.length) {
          return Response.json({ inserted: 0, message: "Nenhuma fonte ativa" });
        }

        const inserts: Record<string, unknown>[] = [];
        const errors: string[] = [];
        await Promise.all(sources.map(async (src) => {
          try {
            const res = await fetch(src.url, {
              headers: { "User-Agent": "AcreEmPautaBot/1.0 (+https://acreempauta.lovable.app)" },
              signal: AbortSignal.timeout(12_000),
            });
            if (!res.ok) { errors.push(`${src.name}: HTTP ${res.status}`); return; }
            const items = parseRss(await res.text(), 6);
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
        }));

        if (!inserts.length) return Response.json({ inserted: 0, errors });

        const urls = inserts.map((i) => i.original_url as string);
        const { data: existing } = await supabaseAdmin
          .from("ai_news_queue").select("original_url").in("original_url", urls);
        const seen = new Set((existing ?? []).map((r) => r.original_url));
        const fresh = inserts.filter((i) => !seen.has(i.original_url as string));
        if (!fresh.length) return Response.json({ inserted: 0, errors, message: "Nada novo" });

        const { error } = await supabaseAdmin.from("ai_news_queue").insert(fresh as never);
        if (error) return new Response(error.message, { status: 500 });

        await supabaseAdmin.from("sources")
          .update({ last_fetched_at: new Date().toISOString() })
          .in("id", sources.map((s) => s.id));

        return Response.json({ inserted: fresh.length, errors });
      },
    },
  },
});