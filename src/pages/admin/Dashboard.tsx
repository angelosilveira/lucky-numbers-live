import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl, formatDateTime } from "@/lib/format";
import { useActiveDraw, useCards, useDrawnNumbers, useSettings, useWinners } from "@/hooks/useActiveDraw";
import { Trophy, CreditCard, Banknote, Activity, TrendingUp } from "lucide-react";
import { useMemo } from "react";

({
  component: AdminDashboard,
});

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  accent?: "gold" | "success" | "default";
}) {
  const valueClass =
    accent === "gold"
      ? "text-yellow-500"
      : accent === "success"
      ? "text-green-500"
      : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase text-muted-foreground tracking-wide">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className={`text-3xl font-display ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground -mt-1">{sub}</div>}
    </div>
  );
}

function AdminDashboard() {
  const draw = useActiveDraw();
  const settings = useSettings();
  const numbers = useDrawnNumbers(draw.data?.id);
  const cards = useCards(draw.data?.id);
  const winners = useWinners(draw.data?.id);

  const totalCards = useQuery({
    queryKey: ["total-cards", draw.data?.id],
    enabled: !!draw.data?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("draw_id", draw.data!.id);
      return count ?? 0;
    },
  });

  const commission = Number(settings.data?.commission ?? 0);
  const cardPrice = Number(draw.data?.card_price ?? 0);
  const totalRevenue = (totalCards.data ?? 0) * cardPrice;
  const netPrize = totalRevenue * (1 - commission / 100);

  const uniqueDrawn = useMemo(
    () => [...new Set((numbers.data ?? []).map((n: any) => n.number as number))],
    [numbers.data],
  );

  const winnersCount = (winners.data ?? []).length;
  const cardsList = (cards.data ?? []) as any[];
  const topHits = (cardsList[0]?.hits ?? 0) as number;
  const topLeaders = topHits > 0 ? cardsList.filter((c: any) => c.hits === topHits) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sorteio ativo.</p>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Sorteio ativo"
          value={draw.data ? "Ao vivo" : "Nenhum"}
          sub={draw.data ? formatDateTime(draw.data.scheduled_at) : "Crie um em Sorteios"}
          icon={Activity}
          accent={draw.data ? "gold" : "default"}
        />
        <Kpi
          label="Total de cartões"
          value={totalCards.data ?? 0}
          sub={`${brl(totalRevenue)} em vendas`}
          icon={CreditCard}
        />
        <Kpi
          label="Prêmio líquido"
          value={brl(netPrize)}
          sub={commission > 0 ? `${commission}% de comissão` : "Sem comissão"}
          icon={Banknote}
          accent="gold"
        />
        <Kpi
          label="Ganhadores"
          value={winnersCount}
          sub={winnersCount > 0 ? `${winnersCount} ganhador${winnersCount > 1 ? "es" : ""}` : "Aguardando"}
          icon={Trophy}
          accent={winnersCount > 0 ? "success" : "default"}
        />
      </div>

      {/* Detalhes */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sorteio atual */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
          <div className="font-display text-lg">Sorteio atual</div>
          {draw.data ? (
            <div className="space-y-3">
              <Row label="Data" value={formatDateTime(draw.data.scheduled_at)} />
              <Row label="Cartões" value={String(totalCards.data ?? 0)} />
              <Row label="Números únicos sorteados" value={`${uniqueDrawn.length} / 100`} />
              <Row label="Prêmio líquido" value={brl(netPrize)} highlight />
              {topLeaders.length > 0 && (
                <Row
                  label={topLeaders.length > 1 ? "Líderes atuais" : "Líder atual"}
                  value={`${topLeaders.map((c: any) => c.player_name).join(", ")} (${topHits} pts)`}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum sorteio ativo.
            </p>
          )}
        </div>

        {/* Últimos ganhadores */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="font-display text-lg mb-4 flex items-center gap-2">
            <Trophy className="size-4 text-yellow-500" />
            Últimos ganhadores
          </div>
          {(winners.data ?? []).length ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2">Jogador</th>
                    <th className="pb-2">Cartão</th>
                    <th className="pb-2 text-right">Prêmio</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(winners.data ?? [])].reverse().slice(0, 10).map((w: any) => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="py-2 font-medium">{w.cards?.player_name ?? "—"}</td>
                      <td className="py-2 font-mono text-muted-foreground">
                        {w.cards?.card_number}
                      </td>
                      <td className="py-2 text-right font-display text-green-500">
                        {brl(Number(w.prize_share))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              Nenhum ganhador ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-display text-base text-yellow-500" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}

export default AdminDashboard;
