import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { NumberGrid } from "@/components/public/NumberGrid";
import { LiveStats } from "@/components/public/LiveStats";
import { CardsTable } from "@/components/public/CardsTable";
import { WinnersPanel } from "@/components/public/WinnersPanel";
import { DrawHistory } from "@/components/public/DrawHistory";
import {
  useActiveDraw,
  useDrawnNumbers,
  useCards,
  useWinners,
  useDrawHistory,
} from "@/hooks/useActiveDraw";
import { brl, formatDateTime } from "@/lib/format";
import { Sparkles, Lock } from "lucide-react";

({
  head: () => ({
    meta: [
      { title: "Jogo do Bicho — Sorteio ao vivo" },
      {
        name: "description",
        content:
          "Acompanhe os números sorteados em tempo real, jogadores líderes e ganhadores do sorteio das 21h.",
      },
      { property: "og:title", content: "Jogo do Bicho — Sorteio ao vivo" },
      {
        property: "og:description",
        content: "Sorteio realtime, ranking e premiação do jogo do bicho.",
      },
    ],
  }),
  component: PublicHome,
});

function PublicHome() {
  const draw = useActiveDraw();
  const drawId = draw.data?.id ?? null;
  const numbers = useDrawnNumbers(drawId);
  const cards = useCards(drawId);
  const winners = useWinners(drawId);
  const history = useDrawHistory();

  const drawnList = (numbers.data ?? []).map((n: any) => n.number);
  const cardsList = (cards.data ?? []) as any[];
  const winnersList = (winners.data ?? []) as any[];

  const leaders = useMemo(
    () =>
      cardsList
        .slice()
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 5),
    [cardsList],
  );

  return (
    <div className="min-h-screen bg-hero">
      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gold flex items-center justify-center shadow-glow-gold">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="font-display text-lg sm:text-xl">
              Bicho<span className="text-gold text-glow-gold">Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card/50 backdrop-blur p-5 sm:p-7"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {draw.data ? "Sorteio em andamento" : "Aguardando sorteio"}
              </div>
              <h1 className="font-display text-3xl sm:text-5xl mt-1">
                {draw.data ? formatDateTime(draw.data.scheduled_at) : "—"}
              </h1>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Prêmio</div>
              <div className="font-display text-3xl sm:text-5xl text-gold text-glow-gold">
                {brl(Number(draw.data?.prize_amount ?? 0))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* STATS */}
        <LiveStats
          stats={[
            { label: "Sorteados", value: drawnList.length, accent: "gold" },
            { label: "Restantes", value: 10 - drawnList.length },
            { label: "Cartões", value: cardsList.length, accent: "neon" },
            { label: "Líderes", value: leaders.filter((l) => l.hits > 0).length },
            { label: "Ganhadores", value: winnersList.length, accent: "success" },
            { label: "Cartão", value: brl(Number(draw.data?.card_price ?? 0)) },
          ]}
        />

        {/* GRID + WINNERS */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-display text-xl">Números sorteados</h2>
            <NumberGrid drawn={drawnList} />
          </div>
          <div className="space-y-4">
            <h2 className="font-display text-xl">Ganhadores</h2>
            <WinnersPanel winners={winnersList} />
          </div>
        </div>

        {/* CARDS + HISTORY */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-display text-xl">Jogadores</h2>
            <CardsTable cards={cardsList} drawn={drawnList} />
          </div>
          <div className="space-y-3">
            <h2 className="font-display text-xl">Histórico</h2>
            <DrawHistory items={(history.data ?? []) as any[]} />
          </div>
        </div>

        <footer className="py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} BichoLive — Atualizado em tempo real
        </footer>
      </main>
    </div>
  );
}
