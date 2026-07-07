import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/AdminSidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel — Acre em Pauta" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}