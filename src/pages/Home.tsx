import { motion } from "framer-motion";
import { useMemo } from "react";
import { NumberGrid } from "@/components/public/NumberGrid";
import { LiveStats } from "@/components/public/LiveStats";
import { CardsTable } from "@/components/public/CardsTable";
import { LeadersPanel } from "@/components/public/LeadersPanel";
import { DrawnNumbersHistory } from "@/components/public/DrawnNumbersHistory";
import { useActiveDraw, useDrawnNumbers, useCards, useSettings } from "@/hooks/useActiveDraw";
import { brl, formatDateTime } from "@/lib/format";
import { Sparkles } from "lucide-react";

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
  const settings = useSettings();

  const drawnEntries = (numbers.data ?? []) as {
    number: number;
    position: number;
    drawn_at: string;
    batch_id?: string | null;
  }[];
  const drawnList = drawnEntries.map((n) => n.number);
  const cardsList = (cards.data ?? []) as any[];

  const uniqueDrawn = useMemo(() => [...new Set(drawnList)], [drawnList]);

  const commission = Number(settings.data?.commission ?? 0);
  const cardPrice = Number(draw.data?.card_price ?? 0);
  const prizeAmount = cardsList.length * cardPrice * (1 - commission / 100);

  const winnersCount = useMemo(() => cardsList.filter((c) => c.hits === 10).length, [cardsList]);
  const leadersCount = useMemo(() => cardsList.filter((c) => c.hits > 0).length, [cardsList]);

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
          <div className="flex flex-wrap items-end justify-center gap-3">
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Prêmio</div>
              <div className="font-display text-3xl sm:text-5xl text-gold text-glow-gold">
                {brl(prizeAmount)}
              </div>
            </div>
          </div>
        </motion.section>

        {/* STATS */}
        <LiveStats
          stats={[
            { label: "Sorteados", value: uniqueDrawn.length, accent: "gold" },
            { label: "Restantes", value: 100 - uniqueDrawn.length },
            { label: "Cartões", value: cardsList.length, accent: "neon" },
            { label: "Líderes", value: leadersCount },
            { label: "Ganhadores", value: winnersCount, accent: "success" },
          ]}
        />

        {/* GRID + LÍDERES */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-display text-xl">Números sorteados</h2>
            <NumberGrid drawn={uniqueDrawn} />
          </div>
          <div className="space-y-4">
            <h2 className="font-display text-xl">{winnersCount > 0 ? "Ganhadores" : "Líderes"}</h2>
            <LeadersPanel cards={cardsList} />
          </div>
        </div>

        {/* DRAWN NUMBERS HISTORY */}
        <div className="space-y-4">
          <h2 className="font-display text-xl">Números sorteados (ordem)</h2>
          <DrawnNumbersHistory entries={drawnEntries} />
        </div>

        {/* CARDS */}
        <div className="space-y-3">
          <h2 className="font-display text-xl">Jogadores</h2>
          <CardsTable cards={cardsList} drawn={uniqueDrawn} />
        </div>

        <footer className="py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} BichoLive — Atualizado em tempo real
        </footer>
      </main>
    </div>
  );
}

export default PublicHome;
