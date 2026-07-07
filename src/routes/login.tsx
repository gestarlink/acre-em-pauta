import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/admin" }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: search.redirect });
  },
  head: () => ({ meta: [{ title: "Entrar — Acre em Pauta" }] }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin`, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email para confirmar.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: search.redirect });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-sand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <h1 className="font-display text-2xl font-bold text-primary">
            {mode === "signin" ? "Acesso editorial" : "Criar conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Entre no painel do Acre em Pauta." : "Crie sua conta para acessar o painel."}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary">
            {mode === "signin" ? "Não tem conta? Criar uma." : "Já tem conta? Entrar."}
          </button>
          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Dica: o primeiro usuário cadastrado vira <span className="font-bold text-primary">admin</span> automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}