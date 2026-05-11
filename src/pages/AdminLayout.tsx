import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Trophy, CreditCard, Settings, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/sorteios", label: "Sorteios", icon: Trophy },
  { to: "/admin/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const { loading, user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useLocation().pathname;

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [loading, user, isAdmin, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="theme-admin min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="theme-admin min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card">
          <div className="px-5 py-5 border-b border-border">
            <div className="font-display text-lg">BichoLive</div>
            <div className="text-xs text-muted-foreground">Painel Administrativo</div>
          </div>
          <nav className="p-3 flex-1 space-y-1">
            {NAV.map((it) => {
              const active = it.exact ? path === it.to : path.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => signOut().then(() => navigate("/login"))}
            className="m-3 flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </aside>

        {/* Mobile top bar + content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="font-display">BichoLive Admin</div>
            <button
              onClick={() => signOut().then(() => navigate("/login"))}
              className="p-2 rounded-md border border-border"
              aria-label="Sair"
            >
              <LogOut className="size-4" />
            </button>
          </header>

          <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
            <Outlet />
          </main>

          {/* Bottom nav mobile */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border grid grid-cols-4">
            {NAV.map((it) => {
              const active = it.exact ? path === it.to : path.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "py-2.5 flex flex-col items-center text-[11px] gap-0.5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

// Silence unused
void Menu;
