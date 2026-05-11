import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveDraw, useCards, useSettings } from "@/hooks/useActiveDraw";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, fmt2 } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

({
  component: CartoesPage,
});

type Draft = { card_number: string; player_name: string; numbers: string };

function emptyDraft(): Draft {
  return { card_number: "", player_name: "", numbers: "" };
}

function parseNumbers(s: string): number[] {
  return s
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => parseInt(x, 10))
    .filter((n) => !isNaN(n));
}

function CartoesPage() {
  const qc = useQueryClient();
  const draw = useActiveDraw();
  const settings = useSettings();
  const cards = useCards(draw.data?.id);
  const price = Number(settings.data?.card_price ?? 10);

  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);

  const total = drafts.length * price;

  const save = useMutation({
    mutationFn: async () => {
      if (!draw.data) throw new Error("Sem sorteio ativo");
      const rows = drafts.map((d, i) => {
        const numbers = parseNumbers(d.numbers);
        if (numbers.length !== 10)
          throw new Error(`Cartão ${i + 1}: precisa de 10 números`);
        if (new Set(numbers).size !== 10)
          throw new Error(`Cartão ${i + 1}: números repetidos`);
        if (numbers.some((n) => n < 0 || n > 99))
          throw new Error(`Cartão ${i + 1}: números fora de 0–99`);
        if (!d.card_number.trim()) throw new Error(`Cartão ${i + 1}: nº do cartão`);
        if (!d.player_name.trim()) throw new Error(`Cartão ${i + 1}: nome`);
        return {
          draw_id: draw.data!.id,
          card_number: d.card_number.trim(),
          player_name: d.player_name.trim(),
          numbers,
          price,
        };
      });
      const { error } = await supabase.from("cards").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cartões cadastrados");
      setDrafts([emptyDraft()]);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display">Cartões</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre os jogadores do sorteio ativo.
        </p>
      </div>

      {!draw.data ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card text-sm text-muted-foreground">
          Nenhum sorteio ativo — crie um em "Sorteios".
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
            {drafts.map((d, i) => (
              <div key={i} className="grid md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-2">
                  <Label>Cartão #</Label>
                  <Input
                    value={d.card_number}
                    onChange={(e) =>
                      setDrafts((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, card_number: e.target.value } : x))
                      )
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Nome</Label>
                  <Input
                    value={d.player_name}
                    onChange={(e) =>
                      setDrafts((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, player_name: e.target.value } : x))
                      )
                    }
                  />
                </div>
                <div className="md:col-span-6">
                  <Label>10 números (0–99, separados por vírgula)</Label>
                  <Input
                    value={d.numbers}
                    placeholder="01, 07, 12, 23, 34, 45, 56, 67, 78, 89"
                    onChange={(e) =>
                      setDrafts((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, numbers: e.target.value } : x))
                      )
                    }
                  />
                </div>
                <div className="md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDrafts((a) => a.filter((_, j) => j !== i))}
                    disabled={drafts.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDrafts((a) => [...a, emptyDraft()])}
              >
                <Plus className="size-4 mr-1" /> Adicionar cartão
              </Button>
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-display text-lg">{brl(total)}</span>
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Salvar cartões
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="font-display text-lg mb-3">
              Cartões do sorteio ({(cards.data ?? []).length})
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">Cartão</th>
                    <th className="py-2">Jogador</th>
                    <th className="py-2">Números</th>
                    <th className="py-2 text-right">Acertos</th>
                  </tr>
                </thead>
                <tbody>
                  {(cards.data ?? []).map((c: any) => (
                    <tr key={c.card_id} className="border-t border-border">
                      <td className="py-2 font-mono">{c.card_number}</td>
                      <td className="py-2">{c.player_name}</td>
                      <td className="py-2 text-muted-foreground">
                        {c.numbers.map(fmt2).join(" ")}
                      </td>
                      <td className="py-2 text-right font-medium">{c.hits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
