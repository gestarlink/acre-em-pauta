import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,email,full_name,avatar_url").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roleList = (roles ?? []).map((r) => r.role as string);
    return {
      userId,
      profile,
      roles: roleList,
      isStaff: roleList.includes("admin") || roleList.includes("editor"),
      isAdmin: roleList.includes("admin"),
    };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const [published, drafts, queue, tips, views, topPosts, queueItems] = await Promise.all([
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).eq("status", "publicado"),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).eq("status", "rascunho"),
      supabaseAdmin.from("ai_news_queue").select("id", { count: "exact", head: true }).eq("status", "novo"),
      supabaseAdmin.from("submitted_tips").select("id", { count: "exact", head: true }).eq("status", "novo"),
      supabaseAdmin.from("posts").select("views_count").eq("status", "publicado"),
      supabaseAdmin.from("posts").select("id,title,views_count,published_at").eq("status", "publicado").order("views_count", { ascending: false }).limit(5),
      supabaseAdmin.from("ai_news_queue").select("id,original_title,source_name,relevance_score,urgency_score,status,created_at").order("created_at", { ascending: false }).limit(8),
    ]);
    const totalViews = (views.data ?? []).reduce((a, r) => a + (r.views_count ?? 0), 0);
    return {
      kpis: {
        published: published.count ?? 0,
        drafts: drafts.count ?? 0,
        queueNew: queue.count ?? 0,
        tipsNew: tips.count ?? 0,
        totalViews,
      },
      topPosts: topPosts.data ?? [],
      queueItems: queueItems.data ?? [],
    };
  });

export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("posts")
      .select("id,title,slug,status,is_featured,is_breaking,published_at,views_count,category_id")
      .order("created_at", { ascending: false })
      .limit(50);
    const { data: cats } = await supabaseAdmin.from("categories").select("id,name");
    return { posts: data ?? [], categories: cats ?? [] };
  });

export const listQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    // Auto-limpeza: itens "novo" com mais de 60 min são removidos.
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("ai_news_queue")
      .delete()
      .eq("status", "novo")
      .lt("created_at", cutoff);
    // Itens publicados também não devem aparecer.
    const { data } = await supabaseAdmin
      .from("ai_news_queue")
      .select("*")
      .neq("status", "publicado")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(50);
    return { items: data ?? [] };
  });

export const listSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("sources").select("*").order("created_at", { ascending: false });
    return { sources: data ?? [] };
  });

export const listTips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("submitted_tips").select("*").order("created_at", { ascending: false }).limit(50);
    return { tips: data ?? [] };
  });

export const updatePostStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "rascunho" | "revisao" | "agendado" | "publicado" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["rascunho", "revisao", "agendado", "publicado"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const update: Record<string, unknown> = { status: data.status };
    if (data.status === "publicado") update.published_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("posts").update(update as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; url: string; source_type: string; active: boolean; credibility: number }) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(120),
      url: z.string().url().max(500),
      source_type: z.enum(["rss", "site", "blog", "oficial", "portal", "manual"]),
      active: z.boolean(),
      credibility: z.number().int().min(0).max(100),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("sources").upsert(data as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTipStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) =>
    z.object({ id: z.string().uuid(), status: z.string().max(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("submitted_tips").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

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

export const fetchFromSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data: sources } = await supabaseAdmin
      .from("sources")
      .select("id,name,url,category_id,source_type,active")
      .eq("active", true);
    if (!sources || sources.length === 0) return { inserted: 0, errors: ["Nenhuma fonte ativa"] };

    const inserts: Record<string, unknown>[] = [];
    const errors: string[] = [];

    await Promise.all(
      sources.map(async (src) => {
        try {
          const res = await fetch(src.url, {
            headers: { "User-Agent": "AcreEmPautaBot/1.0 (+https://acreempauta.lovable.app)" },
            signal: AbortSignal.timeout(12_000),
          });
          if (!res.ok) {
            errors.push(`${src.name}: HTTP ${res.status}`);
            return;
          }
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

    if (inserts.length === 0) {
      return { inserted: 0, errors };
    }

    // Dedupe by URL against existing queue items
    const urls = inserts.map((i) => i.original_url as string);
    const { data: existing } = await supabaseAdmin
      .from("ai_news_queue")
      .select("original_url")
      .in("original_url", urls);
    const seen = new Set((existing ?? []).map((r) => r.original_url));
    const fresh = inserts.filter((i) => !seen.has(i.original_url as string));
    if (fresh.length === 0) return { inserted: 0, errors, message: "Nada novo" };

    const { error } = await supabaseAdmin.from("ai_news_queue").insert(fresh as never);
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("sources")
      .update({ last_fetched_at: new Date().toISOString() })
      .in("id", sources.map((s) => s.id));

    return { inserted: fresh.length, errors };
  });

/* ----- Categories / Users / Ads management ----- */

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("categories").select("*").order("display_order");
    return { categories: data ?? [] };
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; slug: string; description?: string; color?: string; display_order: number }) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(80),
      slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
      description: z.string().max(300).optional(),
      color: z.string().max(40).optional(),
      display_order: z.number().int().min(0).max(999),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("categories").upsert(data as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,email,full_name,avatar_url,created_at").order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    const rolesByUser: Record<string, string[]> = {};
    for (const r of roles ?? []) {
      rolesByUser[r.user_id] = rolesByUser[r.user_id] || [];
      rolesByUser[r.user_id].push(r.role as string);
    }
    return {
      users: (profiles ?? []).map((p) => ({ ...p, roles: rolesByUser[p.id] ?? [] })),
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "editor" | "viewer"; grant: boolean }) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "editor", "viewer"]),
      grant: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Apenas admins podem alterar papéis");
    if (data.grant) {
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role } as never, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("ads").select("*").order("created_at", { ascending: false });
    return { ads: data ?? [] };
  });

export const upsertAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; placement: string; image_url?: string; image_url_mobile?: string; link_url?: string; active: boolean }) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(120),
      placement: z.string().min(1).max(40),
      image_url: z.string().url().optional().or(z.literal("")),
      image_url_mobile: z.string().url().optional().or(z.literal("")),
      link_url: z.string().url().optional().or(z.literal("")),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const payload = {
      ...data,
      image_url: data.image_url || null,
      image_url_mobile: data.image_url_mobile || null,
      link_url: data.link_url || null,
    };
    const { error } = await supabaseAdmin.from("ads").upsert(payload as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("ads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; title: string; slug: string; subtitle?: string; excerpt?: string; body: string; category_id?: string; is_featured: boolean; is_breaking: boolean; status: "rascunho" | "publicado" | "revisao" | "agendado"; cover_image_url?: string }) =>
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(3).max(300),
      slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/),
      subtitle: z.string().max(300).optional(),
      excerpt: z.string().max(500).optional(),
      body: z.string().min(10),
      category_id: z.string().uuid().optional(),
      is_featured: z.boolean(),
      is_breaking: z.boolean(),
      status: z.enum(["rascunho", "publicado", "revisao", "agendado"]),
      cover_image_url: z.string().url().optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const payload: Record<string, unknown> = {
      ...data,
      cover_image_url: data.cover_image_url || null,
      category_id: data.category_id || null,
      author_id: context.userId,
      author_name: "Redação Acre em Pauta",
      updated_at: new Date().toISOString(),
    };
    if (data.status === "publicado") payload.published_at = new Date().toISOString();
    const { data: saved, error } = await supabaseAdmin.from("posts").upsert(payload as never).select().single();
    if (error) throw new Error(error.message);
    return { post: saved };
  });

export const listSocialPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("generated_social_posts")
      .select("*, posts!inner(title,slug)")
      .order("created_at", { ascending: false })
      .limit(50);
    return { items: data ?? [] };
  });

export const listVideoScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("generated_video_scripts")
      .select("*, posts!inner(title,slug)")
      .order("created_at", { ascending: false })
      .limit(50);
    return { items: data ?? [] };
  });

export const listPublishedPostsForSelect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("posts")
      .select("id,title")
      .eq("status", "publicado")
      .order("published_at", { ascending: false })
      .limit(50);
    return { posts: data ?? [] };
  });

export const getPostForSocialGenerator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("id,title,subtitle,excerpt,cover_image_url,category_id,published_at,slug")
      .eq("id", data.id)
      .maybeSingle();
    const { data: cats } = await supabaseAdmin.from("categories").select("id,slug,name");
    return { post, categories: cats ?? [] };
  });

export const getPostForEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: post, error } = await supabaseAdmin
      .from("posts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { post };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------- Upload de imagens (anúncios, capas, etc) -------------- */
export const uploadImageToBucket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { folder: string; filename: string; dataUrl: string }) =>
    z.object({
      folder: z.string().min(1).max(40).regex(/^[a-z0-9_-]+$/),
      filename: z.string().min(1).max(120),
      dataUrl: z.string().startsWith("data:").max(8_000_000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = data.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error("Formato de imagem inválido");
    const contentType = m[1];
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
    const path = `${data.folder}/${Date.now()}-${safeName}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("social-media")
      .upload(path, bin, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const url = supabaseAdmin.storage.from("social-media").getPublicUrl(path).data.publicUrl;
    return { url };
  });

/* ----------------- Analytics para o Dashboard -------------------------- */
export const getDashboardAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const sinceIso = since.toISOString();
    const [{ data: views }, { data: cats }, { data: posts }, subsRes, { data: recent }] = await Promise.all([
      supabaseAdmin.from("post_views").select("viewed_at,post_id").gte("viewed_at", sinceIso).limit(20000),
      supabaseAdmin.from("categories").select("id,name,slug,color"),
      supabaseAdmin.from("posts").select("id,category_id,views_count,status,published_at").eq("status", "publicado"),
      supabaseAdmin.from("push_subscriptions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("id,title,slug,status,published_at,views_count,is_breaking").order("created_at", { ascending: false }).limit(6),
    ]);

    // Série diária de visualizações (últimos 14 dias).
    const buckets: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    for (const v of views ?? []) {
      const k = (v.viewed_at as string).slice(0, 10);
      if (k in buckets) buckets[k]++;
    }
    const series = Object.entries(buckets).map(([date, count]) => ({ date, count }));

    // Visualizações por categoria (soma de views_count dos posts da categoria).
    const catMap = new Map((cats ?? []).map((c) => [c.id, c]));
    const catTotals: Record<string, number> = {};
    for (const p of posts ?? []) {
      if (!p.category_id) continue;
      catTotals[p.category_id] = (catTotals[p.category_id] ?? 0) + (p.views_count ?? 0);
    }
    const byCategory = Object.entries(catTotals)
      .map(([id, total]) => ({
        id,
        name: catMap.get(id)?.name ?? "—",
        color: catMap.get(id)?.color ?? "#0e7a3a",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Posts publicados nos últimos 7 dias.
    const last7 = (posts ?? []).filter((p) => p.published_at && new Date(p.published_at) > new Date(Date.now() - 7 * 86400_000)).length;

    return {
      series,
      byCategory,
      recent: recent ?? [],
      pushSubscribers: subsRes.count ?? 0,
      publishedLast7: last7,
      totalPublished: (posts ?? []).length,
    };
  });