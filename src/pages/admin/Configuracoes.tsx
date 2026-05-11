import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useActiveDraw";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

({
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [cardPrice, setCardPrice] = useState<number>(10);
  const [prize, setPrize] = useState<number>(0);
  const [commission, setCommission] = useState<number>(0);

  useEffect(() => {
    if (data) {
      setCardPrice(Number(data.card_price));
      setPrize(Number(data.prize_amount));
      setCommission(Number(data.commission ?? 0));
    }
  }, [data]);

  const commissionError =
    commission < 0 || commission > 100
      ? "A comissão deve ser entre 0% e 100%"
      : null;

  const save = useMutation({
    mutationFn: async () => {
      if (commissionError) throw new Error(commissionError);
      const { error } = await supabase
        .from("settings")
        .update({
          card_price: cardPrice,
          prize_amount: prize,
          commission,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-display">Configurações</h1>
        <p className="text-sm text-muted-foreground">Valores padrão para novos sorteios.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
        <div>
          <Label>Valor padrão do cartão (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={cardPrice}
            onChange={(e) => setCardPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Valor padrão do prêmio (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={prize}
            onChange={(e) => setPrize(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Comissão (%)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value))}
            placeholder="0"
          />
          {commissionError && (
            <p className="text-xs text-destructive mt-1">{commissionError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            O prêmio exibido será: total de cartões × valor do cartão × (1 − comissão%)
          </p>
        </div>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !!commissionError}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

export default ConfigPage;
