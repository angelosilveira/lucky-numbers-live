import { fmt2 } from "@/lib/format";

type DrawnEntry = {
  number: number;
  position: number;
  drawn_at: string;
  batch_id?: string | null;
};

const dtFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function groupIntoRounds(entries: DrawnEntry[]): DrawnEntry[][] {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const byBatch = new Map<string, DrawnEntry[]>();
  const legacy: DrawnEntry[] = [];

  for (const e of sorted) {
    if (e.batch_id) {
      if (!byBatch.has(e.batch_id)) byBatch.set(e.batch_id, []);
      byBatch.get(e.batch_id)!.push(e);
    } else {
      legacy.push(e);
    }
  }

  const result: DrawnEntry[][] = [...byBatch.values()];
  for (let i = 0; i < legacy.length; i += 10) result.push(legacy.slice(i, i + 10));
  return result
    .sort((a, b) => new Date(a[0].drawn_at).getTime() - new Date(b[0].drawn_at).getTime())
    .reverse();
}

export function DrawnNumbersHistory({ entries }: { entries: DrawnEntry[] }) {
  const rounds = groupIntoRounds(entries);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card/90 backdrop-blur z-10">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Horário</th>
              <th className="px-3 py-2">Números sorteados</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round, idx) => (
              <tr key={round[0].position} className="border-t border-border">
                <td className="px-3 py-2 text-muted-foreground align-middle">
                  {rounds.length - idx}
                </td>
                <td className="px-3 py-2 text-muted-foreground align-middle whitespace-nowrap">
                  {dtFmt.format(new Date(round[0].drawn_at))}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex flex-wrap gap-1">
                    {round.map((e) => (
                      <span
                        key={e.position}
                        className="px-1.5 py-0.5 rounded text-xs font-mono bg-gold text-primary-foreground"
                      >
                        {fmt2(e.number)}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!rounds.length && (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhum número sorteado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
