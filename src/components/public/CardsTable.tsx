import { motion, AnimatePresence } from "framer-motion";
import { fmt2 } from "@/lib/format";
import { cn } from "@/lib/utils";

type Card = {
  card_id: string;
  card_number: string;
  player_name: string;
  numbers: number[];
  hits: number;
};

export function CardsTable({ cards, drawn }: { cards: Card[]; drawn: number[] }) {
  const drawnSet = new Set(drawn);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card/90 backdrop-blur z-10">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Cartão</th>
              <th className="px-3 py-2">Jogador</th>
              <th className="px-3 py-2">Números</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {cards.map((c, i) => (
                <motion.tr
                  key={c.card_id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn("border-t border-border", c.hits === 10 && "bg-success/10")}
                >
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-mono">{c.card_number}</td>
                  <td className="px-3 py-2 font-medium">{c.player_name}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.numbers.map((n) => (
                        <span
                          key={n}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-mono",
                            drawnSet.has(n)
                              ? "bg-gold text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {fmt2(n)}
                        </span>
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {!cards.length && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhum cartão neste sorteio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
