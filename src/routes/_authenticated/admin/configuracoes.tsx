import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useActiveDraw";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [cardPrice, setCardPrice] = useState<number>(10);
  const [prize, setPrize] = useState<number>(0);

  useEffect(() => {
    if (data) {
      setCardPrice(Number(data.card_price));
      setPrize(Number(data.prize_amount));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("settings")
        .update({
          card_price: cardPrice,
          prize_amount: prize,
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
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
