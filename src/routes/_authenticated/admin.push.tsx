import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { sendPushNotification, getPushStats } from "@/lib/push-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/push")({
  head: () => ({ meta: [{ title: "Push — Acre em Pauta" }, { name: "robots", content: "noindex" }] }),
  component: AdminPush,
});

function AdminPush() {
  const send = useServerFn(sendPushNotification);
  const stats = useServerFn(getPushStats);
  const { data: statsData } = useQuery({ queryKey: ["push-stats"], queryFn: () => stats() });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await send({ data: { title, body, url, image: null, tag: "admin" } });
      toast.success(`Enviado para ${res.sent}/${res.total} dispositivos${res.removed ? ` (${res.removed} inválidos removidos)` : ""}.`);
      setTitle("");
      setBody("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary"><Bell className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold">Notificações Push</h1>
          <p className="text-sm text-muted-foreground">{statsData?.subscribers ?? 0} dispositivos inscritos.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Ex.: Plantão — Operação em Rio Branco" />
        </div>
        <div>
          <Label htmlFor="body">Mensagem</Label>
          <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} rows={3} required placeholder="Resumo curto da notícia" />
        </div>
        <div>
          <Label htmlFor="url">URL de destino</Label>
          <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={512} placeholder="/noticia/slug-da-noticia" />
        </div>
        <Button type="submit" disabled={sending} className="w-full gap-2">
          <Send className="h-4 w-4" /> {sending ? "Enviando..." : "Enviar para todos"}
        </Button>
      </form>
    </div>
  );
}