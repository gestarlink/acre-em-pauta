import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "sonner";

export const Route = createFileRoute("/enviar-pauta")({
  head: () => ({ meta: [{ title: "Enviar Pauta — Acre em Pauta" }, { name: "description", content: "Envie sua pauta para o Acre em Pauta." }] }),
  component: Page,
});

function Page() {
  const [sending, setSending] = useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("submitted_tips").insert({
      name: String(f.get("name") ?? ""),
      whatsapp: String(f.get("whatsapp") ?? ""),
      email: String(f.get("email") ?? ""),
      city: String(f.get("city") ?? ""),
      neighborhood: String(f.get("neighborhood") ?? ""),
      description: String(f.get("description") ?? ""),
      allow_contact: f.get("contact") === "on",
    });
    setSending(false);
    if (error) toast.error("Erro ao enviar: " + error.message);
    else { toast.success("Pauta enviada! Obrigado."); (e.target as HTMLFormElement).reset(); }
  };
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl font-bold text-primary">Enviar Pauta</h1>
        <p className="mt-2 text-muted-foreground">Conte para nossa redação o que está acontecendo na sua cidade.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {[
            { name: "name", label: "Nome *", type: "text", required: true },
            { name: "whatsapp", label: "WhatsApp", type: "tel" },
            { name: "email", label: "E-mail", type: "email" },
            { name: "city", label: "Cidade", type: "text" },
            { name: "neighborhood", label: "Bairro", type: "text" },
          ].map((f) => (
            <label key={f.name} className="block">
              <span className="text-sm font-semibold text-foreground">{f.label}</span>
              <input required={f.required} name={f.name} type={f.type} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </label>
          ))}
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Descrição do fato *</span>
            <textarea required name="description" rows={5} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="contact" defaultChecked /> Permito contato da redação
          </label>
          <button disabled={sending} className="w-full rounded-md bg-accent px-4 py-3 font-bold uppercase tracking-wider text-accent-foreground hover:opacity-90 disabled:opacity-50">
            {sending ? "Enviando..." : "Enviar Pauta"}
          </button>
        </form>
        <Link to="/" className="mt-6 inline-block text-sm text-accent hover:underline">← Voltar</Link>
      </div>
      <SiteFooter />
    </div>
  );
}