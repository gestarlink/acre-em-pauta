import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, setUserRole } from "@/lib/admin.functions";
import { toast } from "sonner";

const q = queryOptions({ queryKey: ["admin", "users"], queryFn: () => listUsers() });

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
});

const ROLES = ["admin", "editor", "viewer"] as const;

function Page() {
  const { data } = useSuspenseQuery(q);
  const qc = useQueryClient();
  const setRole = useServerFn(setUserRole);
  const m = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "editor" | "viewer"; grant: boolean }) => setRole({ data: v }),
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-primary">Usuários</h1>
      <p className="text-sm text-muted-foreground">Gerencie papéis da equipe. Apenas admins podem alterar.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Papéis</th></tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{u.full_name ?? u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((r) => {
                      const has = u.roles.includes(r);
                      return (
                        <label key={r} className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${has ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                          <input type="checkbox" checked={has} onChange={(e) => m.mutate({ userId: u.id, role: r, grant: e.target.checked })} />
                          {r}
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {data.users.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum usuário ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}