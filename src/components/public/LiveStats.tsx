import { motion } from "framer-motion";
import { brl } from "@/lib/format";

type Stat = { label: string; value: string | number; accent?: "gold" | "neon" | "success" };

export function LiveStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((s) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 bg-card/70 backdrop-blur border border-border shadow-card"
        >
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
          <div
            className={
              "mt-1 font-display text-2xl md:text-3xl " +
              (s.accent === "gold"
                ? "text-gold text-glow-gold"
                : s.accent === "neon"
                ? "text-accent text-glow-neon"
                : s.accent === "success"
                ? "text-success"
                : "text-foreground")
            }
          >
            {s.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export const money = brl;
