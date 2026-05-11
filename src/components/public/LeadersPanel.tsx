import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { fmt2 } from "@/lib/format";
import { cn } from "@/lib/utils";

type CardEntry = {
  card_id: string;
  card_number: string;
  player_name: string;
  numbers: number[];
  hits: number;
};

export function LeadersPanel({ cards }: { cards: CardEntry[] }) {
  if (!cards.length) {
    return (
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-8 text-center text-muted-foreground text-sm">
        Aguardando jogadores...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur">
      <div className="max-h-[420px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {cards.map((c, i) => {
            const isWinner = c.hits === 10;
            return (
              <motion.div
                key={c.card_id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-border last:border-0",
                  isWinner && "bg-success/10"
                )}
              >
                {/* Posição */}
                <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                  {i + 1}
                </span>

                {/* Ícone de troféu para ganhadores */}
                {isWinner ? (
                  <div className="size-8 rounded-full bg-gold flex items-center justify-center shadow-glow-gold shrink-0">
                    <Trophy className="size-4 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-display text-muted-foreground">{c.hits}</span>
                  </div>
                )}

                {/* Nome e cartão */}
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-sm truncate", isWinner && "text-gold")}>
                    {c.player_name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Cartão {c.card_number}
                  </div>
                </div>

                {/* Badge de acertos */}
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-9 px-2 py-1 rounded-md font-display text-base shrink-0",
                    isWinner
                      ? "bg-success text-success-foreground shadow-glow-success"
                      : c.hits >= 7
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {c.hits}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
