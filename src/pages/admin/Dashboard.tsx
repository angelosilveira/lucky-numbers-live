import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { useActiveDraw, useCards, useDrawnNumbers, useWinners } from "@/hooks/useActiveDraw";
import { Trophy, Users, Banknote, Activity } from "lucide-react";

({
  component: AdminDashboard,
});

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase text-muted-foreground tracking-wide">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-display">{value}</div>
    </div>
  );
}

function AdminDashboard() {
  const draw = useActiveDraw();
  const numbers = useDrawnNumbers(draw.data?.id);
  const cards = useCards(draw.data?.id);
  const winners = useWinners(draw.data?.id);

  const monthly = useQuery({
    queryKey: ["revenue-month"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("cards")
        .select("price, created_at")
        .gte("created_at", start.toISOString());
      if (error) throw error;
      return (data ?? []).reduce((s, r: any) => s + Number(r.price), 0);
    },
  });

  const todayCards = useQuery({
    queryKey: ["cards-today"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start.toISOString());
      return count ?? 0;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral em tempo real.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Sorteio ativo"
          value={draw.data ? "Ao vivo" : "Nenhum"}
          icon={Activity}
        />
        <Kpi label="Cartões hoje" value={todayCards.data ?? 0} icon={Users} />
        <Kpi label="Faturamento mês" value={brl(monthly.data ?? 0)} icon={Banknote} />
        <Kpi label="Ganhadores" value={(winners.data ?? []).length} icon={Trophy} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="font-display text-lg mb-3">Sorteio atual</div>
          {draw.data ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Prêmio: </span>
                <span className="font-medium">{brl(Number(draw.data.prize_amount))}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cartões: </span>
                <span className="font-medium">{(cards.data ?? []).length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Números sorteados: </span>
                <span className="font-medium">{(numbers.data ?? []).length}/10</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum sorteio ativo. Crie um em "Sorteios".
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="font-display text-lg mb-3">Últimos ganhadores</div>
          <ul className="space-y-2 text-sm">
            {(winners.data ?? []).slice(-5).reverse().map((w: any) => (
              <li key={w.id} className="flex justify-between">
                <span>{w.cards?.player_name}</span>
                <span className="text-success font-medium">{brl(Number(w.prize_share))}</span>
              </li>
            ))}
            {!(winners.data ?? []).length && (
              <li className="text-muted-foreground">Sem ganhadores ainda.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
