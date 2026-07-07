import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSocialPosts, listPublishedPostsForSelect } from "@/lib/admin.functions";
import { generateSocialPost } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const listQ = queryOptions({ queryKey: ["admin", "social"], queryFn: () => listSocialPosts() });
const postsQ = queryOptions({ queryKey: ["admin", "published-for-select"], queryFn: () => listPublishedPostsForSelect() });

export const Route = createFileRoute("/_authenticated/admin/post-social")({
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(listQ), context.queryClient.ensureQueryData(postsQ)]);
  },
  component: Page,
});

function Page() {
  const { data: items } = useSuspenseQuery(listQ);
  const { data: posts } = useSuspenseQuery(postsQ);
  const qc = useQueryClient();
  const gen = useServerFn(generateSocialPost);
  const [postId, setPostId] = useState("");
  const [format, setFormat] = useState<"card" | "story" | "reels" | "plantao" | "urgente">("card");

  const m = useMutation({
    mutationFn: () => gen({ data: { postId, format } }),
    onSuccess: () => { toast.success("Peça gerada"); qc.invalidateQueries({ queryKey: ["admin", "social"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">Gerar post social</h1>
      <p className="text-sm text-muted-foreground">Card, story, reels ou plantão a partir de uma notícia publicada.</p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
          <select value={postId} onChange={(e) => setPostId(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">— escolher notícia —</option>
            {posts.posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select value={format} onChange={(e) => setFormat(e.target.value as never)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {["card","story","reels","plantao","urgente"].map((f) => <option key={f}>{f}</option>)}
          </select>
          <button onClick={() => m.mutate()} disabled={!postId || m.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {m.isPending ? "Gerando…" : "Gerar"}
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.items.map((s: any) => (
          <article key={s.id} className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.format} · {s.posts?.title}</p>
            {s.image_url && (
              <img src={s.image_url} alt={s.headline} className="mt-3 w-full rounded-lg border border-border object-cover" />
            )}
            <h3 className="mt-2 font-display text-lg font-bold text-primary">{s.headline}</h3>
            <p className="mt-2 text-sm">{s.body_text}</p>
            <p className="mt-3 rounded bg-muted/50 p-2 text-xs text-muted-foreground">{s.caption}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-accent">{s.cta}</p>
            {s.image_url && (
              <a href={s.image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-primary hover:underline">
                Baixar imagem
              </a>
            )}
          </article>
        ))}
        {items.items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma peça gerada ainda.</p>}
      </div>
    </div>
  );
}