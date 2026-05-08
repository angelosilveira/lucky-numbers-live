import { motion } from "framer-motion";
import { fmt2 } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  drawn: number[];
};

const ALL = Array.from({ length: 100 }, (_, i) => i);

export function NumberGrid({ drawn }: Props) {
  const drawnSet = new Set(drawn);
  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
      {ALL.map((n) => {
        const hit = drawnSet.has(n);
        return (
          <motion.div
            key={n}
            layout
            initial={false}
            animate={
              hit
                ? { scale: [1, 1.18, 1], rotateY: [0, 180, 360] }
                : { scale: 1 }
            }
            transition={{ duration: 0.7 }}
            className={cn(
              "aspect-square rounded-lg flex items-center justify-center font-display font-bold text-base sm:text-xl select-none border",
              hit
                ? "bg-gold text-primary-foreground border-primary shadow-glow-gold animate-pulse-glow"
                : "bg-card/60 text-muted-foreground border-border"
            )}
          >
            {fmt2(n)}
          </motion.div>
        );
      })}
    </div>
  );
}
