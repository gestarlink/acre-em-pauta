import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const admin = supabaseAdmin;
  const opinionCatRes = await admin.from("categories").select("id").eq("slug", "opiniao").maybeSingle();
  const opinionCatId = opinionCatRes.data?.id ?? null;
  const [featuredRes, latestRes, breakingRes, categoriesRes, opinionRes] = await Promise.all([
    admin.from("posts").select("id,slug,title,subtitle,excerpt,cover_image_url,published_at,category_id").eq("status", "publicado").eq("is_featured", true).order("published_at", { ascending: false }).limit(1),
    admin.from("posts").select("id,slug,title,excerpt,cover_image_url,published_at,category_id").eq("status", "publicado").order("published_at", { ascending: false }).limit(6),
    admin.from("posts").select("id,slug,title").eq("status", "publicado").eq("is_breaking", true).order("published_at", { ascending: false }).limit(5),
    admin.from("categories").select("id,slug,name").order("display_order"),
    opinionCatId
      ? admin.from("posts").select("id,slug,title,excerpt,author_name,published_at").eq("status", "publicado").eq("category_id", opinionCatId).order("published_at", { ascending: false }).limit(3)
      : Promise.resolve({ data: [] as { id: string; slug: string; title: string; excerpt: string | null; author_name: string | null; published_at: string | null }[] }),
  ]);
  return {
    featured: featuredRes.data?.[0] ?? null,
    latest: latestRes.data ?? [],
    breaking: breakingRes.data ?? [],
    categories: categoriesRes.data ?? [],
    opinion: opinionRes.data ?? [],
  };
});

export const getLatestPaged = createServerFn({ method: "GET" })
  .inputValidator((d: { offset: number; limit: number; categorySlug?: string | null }) => d)
  .handler(async ({ data }) => {
    let categoryId: string | null = null;
    if (data.categorySlug) {
      const c = await supabaseAdmin.from("categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      categoryId = c.data?.id ?? null;
      if (!categoryId) return { items: [], nextOffset: null as number | null };
    }
    let q = supabaseAdmin
      .from("posts")
      .select("id,slug,title,excerpt,cover_image_url,published_at,category_id")
      .eq("status", "publicado")
      .order("published_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data: rows } = await q;
    const items = rows ?? [];
    return { items, nextOffset: items.length < data.limit ? null : data.offset + data.limit };
  });

export const getPlantaoPosts = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id,slug,title,excerpt,cover_image_url,published_at,is_breaking")
    .eq("status", "publicado")
    .eq("is_breaking", true)
    .order("published_at", { ascending: false })
    .limit(30);
  return { items: data ?? [] };
});