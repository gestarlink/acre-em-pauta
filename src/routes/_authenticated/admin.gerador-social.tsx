import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { listPublishedPostsForSelect, getPostForSocialGenerator } from "@/lib/admin.functions";
import { generateInstagramCopy } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Copy, Download, Sparkles, Image as ImageIcon, FileText } from "lucide-react";
import { InstagramCardCanvas, FORMAT_SIZES, CATEGORY_COLORS, type CardFormat, type InstagramCardCanvasHandle } from "@/components/InstagramCardCanvas";

const searchSchema = z.object({ id: z.string().uuid().optional() });

const postsQ = queryOptions({
  queryKey: ["admin", "social-generator", "posts"],
  queryFn: () => listPublishedPostsForSelect(),
});

export const Route = createFileRoute("/_authenticated/admin/gerador-social")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQ),
  component: Page,
});

function Page() {
  const { id } = Route.useSearch();
  const { data: postsList } = useSuspenseQuery(postsQ);
  const [postId, setPostId] = useState<string>(id ?? "");
  const [format, setFormat] = useState<CardFormat>("feed");
  const [headline, setHeadline] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [publishedAt, setPublishedAt] = useState<string>("");
  const [categories, setCategories] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [storiesText, setStoriesText] = useState("");
  const [whatsappText, setWhatsappText] = useState("");

  const canvasRef = useRef<InstagramCardCanvasHandle>(null);

  const getPost = useServerFn(getPostForSocialGenerator);
  const genCopy = useServerFn(generateInstagramCopy);

  // Carrega dados do post quando muda a seleção.
  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await getPost({ data: { id: postId } });
        if (cancelled || !r.post) return;
        const post = r.post;
        setHeadline((cur) => cur || post.title);
        setImageUrl(post.cover_image_url ?? "");
        setPublishedAt(post.published_at ?? "");
        setCategories(r.categories);
        const cat = r.categories.find((c) => c.id === post.category_id);
        if (cat) setCategorySlug((cur) => cur || cat.slug);
      } catch (e) {
        toast.error((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [postId, getPost]);

  const genArtM = useMutation({
    mutationFn: async () => {
      if (!postId) throw new Error("Selecione uma notícia");
      const r = await genCopy({ data: { postId, categorySlug: categorySlug || undefined } });
      return r;
    },
    onSuccess: (r) => {
      setHeadline(r.short_headline);
      setCaption(r.caption);
      setHashtags(r.hashtags);
      setStoriesText(r.stories_text);
      setWhatsappText(r.whatsapp_text);
      toast.success("Textos gerados pela IA");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const headlineLen = headline.length;
  const hashString = useMemo(() => hashtags.map((h) => "#" + h.replace(/^#/, "")).join(" "), [hashtags]);

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copiado`); }
    catch { toast.error("Falha ao copiar"); }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Gerador Social</h1>
          <p className="text-sm text-muted-foreground">Crie cards prontos para Instagram a partir de qualquer notícia publicada.</p>
        </div>
        <Link to="/admin/noticias" className="text-xs font-bold uppercase tracking-wider text-primary hover:underline">← Notícias</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        {/* COLUNA ESQUERDA — controles */}
        <section className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Notícia</label>
            <select
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— escolher notícia publicada —</option>
              {postsList.posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Formato</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as CardFormat)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {(Object.keys(FORMAT_SIZES) as CardFormat[]).map((f) => (
                    <option key={f} value={f}>{FORMAT_SIZES[f].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Categoria</label>
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">— automática —</option>
                  {Object.keys(CATEGORY_COLORS).map((slug) => (
                    <option key={slug} value={slug}>{CATEGORY_COLORS[slug].label}</option>
                  ))}
                  {categories.filter((c) => !CATEGORY_COLORS[c.slug]).map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Headline (máx 90)</label>
                <span className={`text-[11px] ${headlineLen > 90 ? "text-destructive" : "text-muted-foreground"}`}>{headlineLen}/90</span>
              </div>
              <textarea
                value={headline}
                onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
                rows={3}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-snug"
                placeholder="Manchete que aparece no card…"
              />
            </div>

            <div className="mt-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Imagem de fundo</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://… ou envie arquivo"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs"
                />
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted">
                  <ImageIcon className="h-3 w-3" /> Enviar
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(f); }} />
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => genArtM.mutate()}
                disabled={!postId || genArtM.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {genArtM.isPending ? "Gerando…" : "Gerar Legenda (IA)"}
              </button>
              <button
                onClick={() => canvasRef.current?.redraw()}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-muted"
              >
                <FileText className="h-4 w-4" /> Gerar Arte
              </button>
              <button
                onClick={() => canvasRef.current?.download(`acre-em-pauta-${format}.png`)}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wider text-accent-foreground hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Baixar PNG
              </button>
            </div>
          </div>

          {/* Saídas de texto */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <TextBlock label="Legenda para Instagram" value={caption} onChange={setCaption} onCopy={() => copy(caption, "Legenda")} rows={6} />
            <TextBlock label="Hashtags" value={hashString} onChange={(v) => setHashtags(v.split(/\s+/).map((s) => s.replace(/^#/, "")).filter(Boolean))} onCopy={() => copy(hashString, "Hashtags")} rows={3} />
            <TextBlock label="Chamada para Stories" value={storiesText} onChange={setStoriesText} onCopy={() => copy(storiesText, "Stories")} rows={2} />
            <TextBlock label="Texto para WhatsApp" value={whatsappText} onChange={setWhatsappText} onCopy={() => copy(whatsappText, "WhatsApp")} rows={3} />
          </div>
        </section>

        {/* COLUNA DIREITA — prévia */}
        <section className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prévia {FORMAT_SIZES[format].label}</p>
            <div className="mt-3 mx-auto" style={{ maxWidth: format === "feed" ? 420 : format === "square" ? 460 : 360 }}>
              <InstagramCardCanvas
                ref={canvasRef}
                format={format}
                imageUrl={imageUrl || null}
                headline={headline || "Manchete da notícia aparecerá aqui"}
                categorySlug={categorySlug || null}
                publishedAt={publishedAt || null}
              />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Dica: se a imagem original for de domínio externo sem CORS, faça upload pelo botão "Enviar" para garantir o download.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function TextBlock({ label, value, onChange, onCopy, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; onCopy: () => void; rows?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
        <button onClick={onCopy} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline">
          <Copy className="h-3 w-3" /> Copiar
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-snug"
      />
    </div>
  );
}