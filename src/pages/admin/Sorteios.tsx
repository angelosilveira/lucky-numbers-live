import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveDraw, useDrawnNumbers, useDrawHistory, useSettings } from "@/hooks/useActiveDraw";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { brl, fmt2, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

({
  component: SorteiosPage,
});

function SorteiosPage() {
  const qc = useQueryClient();
  const draw = useActiveDraw();
  const settings = useSettings();
  const numbers = useDrawnNumbers(draw.data?.id);
  const history = useDrawHistory();

  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [prize, setPrize] = useState<number>(0);
  const [num, setNum] = useState<string>("");

  const createDraw = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("draws").insert({
        scheduled_at: new Date(scheduledAt).toISOString(),
        prize_amount: prize || Number(settings.data?.prize_amount ?? 0),
        card_price: Number(settings.data?.card_price ?? 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sorteio criado");
      qc.invalidateQueries();
    },
    onError: (e: any) =>
      toast.error(
        e.message?.includes("draws_one_active") || e.code === "23505"
          ? "Já existe um sorteio ativo"
          : e.message
      ),
  });

  const addNum = useMutation({
    mutationFn: async (n: number) => {
      const { error } = await supabase.rpc("add_draw_number", {
        p_draw: draw.data!.id,
        p_number: n,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNum("");
      toast.success("Número adicionado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const finalize = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("draws")
        .update({ status: "finalized", finalized_at: new Date().toISOString() })
        .eq("id", draw.data!.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Sorteio finalizado"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display">Sorteios</h1>
          <p className="text-sm text-muted-foreground">Gerencie sorteio ativo e histórico.</p>
        </div>
      </div>

      {!draw.data ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card max-w-xl">
          <div className="font-display text-lg mb-3">Criar novo sorteio</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Data/Hora</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Prêmio (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={prize}
                onChange={(e) => setPrize(Number(e.target.value))}
                placeholder={String(settings.data?.prize_amount ?? 0)}
              />
            </div>
          </div>
          <Button className="mt-4" onClick={() => createDraw.mutate()} disabled={createDraw.isPending}>
            Criar sorteio
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Sorteio ativo</div>
              <div className="font-display text-xl">{formatDateTime(draw.data.scheduled_at)}</div>
              <div className="text-sm text-muted-foreground">
                Prêmio: {brl(Number(draw.data.prize_amount))}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Finalizar sorteio</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza que deseja finalizar este sorteio?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Após finalizado não será possível adicionar mais números.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => finalize.mutate()}>Finalizar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="mt-5">
            <div className="text-sm font-medium mb-2">
              Números sorteados ({(numbers.data ?? []).length}/10)
            </div>
            <div className="flex flex-wrap gap-2">
              {(numbers.data ?? []).map((n: any) => (
                <span
                  key={n.position}
                  className="size-10 rounded-md bg-primary text-primary-foreground font-display flex items-center justify-center"
                >
                  {fmt2(n.number)}
                </span>
              ))}
              {!(numbers.data ?? []).length && (
                <span className="text-sm text-muted-foreground">Nenhum ainda.</span>
              )}
            </div>

            {(numbers.data ?? []).length < 10 && (
              <div className="mt-4 flex items-end gap-2 max-w-xs">
                <div className="flex-1">
                  <Label>Próximo número (0-99)</Label>
                  <Input
                    inputMode="numeric"
                    value={num}
                    onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="00"
                  />
                </div>
                <Button
                  onClick={() => {
                    const n = parseInt(num, 10);
                    if (isNaN(n) || n < 0 || n > 99) {
                      toast.error("Informe 0–99");
                      return;
                    }
                    addNum.mutate(n);
                  }}
                  disabled={addNum.isPending}
                >
                  Adicionar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="font-display text-lg mb-3">Histórico</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Data</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Prêmio</th>
              </tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((d: any) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-2">{formatDateTime(d.scheduled_at)}</td>
                  <td className="py-2 capitalize">{d.status}</td>
                  <td className="py-2 text-right">{brl(Number(d.prize_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SorteiosPage;
