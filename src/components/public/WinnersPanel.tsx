import { motion } from "framer-motion";
import { brl, formatDateTime } from "@/lib/format";
import { Trophy } from "lucide-react";

type Winner = {
  id: string;
  hits: number;
  prize_share: number;
  won_at: string;
  cards: { card_number: string; player_name: string } | null;
};

export function WinnersPanel({ winners }: { winners: Winner[] }) {
  if (!winners.length) {
    return (
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-8 text-center text-muted-foreground">
        Aguardando o(s) primeiro(s) ganhador(es)...
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {winners.map((w, i) => (
        <motion.div
          key={w.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/40 bg-gradient-to-r from-card to-card/60 p-4 shadow-glow-gold flex items-center gap-4"
        >
          <div className="size-12 rounded-full bg-gold flex items-center justify-center shadow-glow-gold">
            <Trophy className="size-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-lg truncate">{w.cards?.player_name ?? "—"}</span>
              <span className="text-xs text-muted-foreground font-mono">
                Cartão {w.cards?.card_number}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {i + 1}º lugar • {formatDateTime(w.won_at)} • {w.hits} acertos
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground">Prêmio</div>
            <div className="font-display text-xl text-gold text-glow-gold">{brl(Number(w.prize_share))}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
