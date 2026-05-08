import { formatDateTime } from "@/lib/format";

type Item = {
  id: string;
  scheduled_at: string;
  status: string;
  prize_amount: number;
  finalized_at: string | null;
};

export function DrawHistory({ items }: { items: Item[] }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur overflow-hidden">
      <div className="px-4 py-3 border-b border-border font-display text-lg">Histórico</div>
      <ul className="divide-y divide-border">
        {items.map((d) => (
          <li key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{formatDateTime(d.scheduled_at)}</div>
              <div className="text-xs text-muted-foreground capitalize">{d.status}</div>
            </div>
            <span
              className={
                "px-2 py-1 rounded-md text-xs font-medium " +
                (d.status === "active"
                  ? "bg-accent/20 text-accent"
                  : d.status === "finalized"
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground")
              }
            >
              {d.status === "active" ? "Ao vivo" : d.status === "finalized" ? "Finalizado" : "Cancelado"}
            </span>
          </li>
        ))}
        {!items.length && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sem sorteios.</li>
        )}
      </ul>
    </div>
  );
}
