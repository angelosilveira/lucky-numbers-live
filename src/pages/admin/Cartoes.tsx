import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveDraw, useCards, useSettings } from "@/hooks/useActiveDraw";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { brl, fmt2 } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, CheckCircle2, XCircle } from "lucide-react";

({
  component: CartoesPage,
});

type Draft = { player_name: string; numbers: string };

function emptyDraft(): Draft {
  return { player_name: "", numbers: "" };
}

function parseNumbers(s: string): number[] {
  return s
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => parseInt(x, 10))
    .filter((n) => !isNaN(n));
}

function validateNumbers(s: string): { ok: boolean; msg: string; nums: number[] | null } {
  const nums = parseNumbers(s);
  if (nums.length === 0) return { ok: false, msg: "", nums: null };
  if (nums.some((n) => n < 0 || n > 99)) return { ok: false, msg: "Números fora de 0–99", nums: null };
  if (new Set(nums).size !== nums.length) return { ok: false, msg: "Números repetidos", nums: null };
  if (nums.length < 10) return { ok: false, msg: `${nums.length}/10 — faltam ${10 - nums.length}`, nums: null };
  if (nums.length > 10) return { ok: false, msg: `${nums.length}/10 — remova ${nums.length - 10}`, nums: null };
  return { ok: true, msg: "10 números válidos", nums };
}

function NumbersValidation({ value }: { value: string }) {
  const v = validateNumbers(value);
  if (!value.trim() || !v.msg) return null;
  return (
    <div className={"flex items-center gap-1 text-xs mt-0.5 " + (v.ok ? "text-green-500" : "text-destructive")}>
      {v.ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {v.msg}
    </div>
  );
}

function CartoesPage() {
  const qc = useQueryClient();
  const draw = useActiveDraw();
  const settings = useSettings();
  const cards = useCards(draw.data?.id);
  const price = Number(settings.data?.card_price ?? 10);

  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);

  // --- editar cartão ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumbers, setEditNumbers] = useState("");

  const existingCount = (cards.data ?? []).length;

  function nextCardNumber(draftIndex: number) {
    return String(existingCount + draftIndex + 1).padStart(3, "0");
  }

  const total = drafts.length * price;

  const draftErrors = useMemo(() =>
    drafts.map((d, i) => {
      const errors: string[] = [];
      if (!d.player_name.trim()) errors.push("Nome obrigatório");
      const v = validateNumbers(d.numbers);
      if (d.numbers.trim() && !v.ok) errors.push(v.msg);
      else if (!d.numbers.trim()) errors.push("Informe os números");
      return errors;
    }),
  [drafts]);

  const canSave = draftErrors.every((e) => e.length === 0);

  function invalidateCards() {
    qc.invalidateQueries({ queryKey: ["card-hits", draw.data?.id] });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!draw.data) throw new Error("Sem sorteio ativo");
      const rows = drafts.map((d, i) => {
        const numbers = parseNumbers(d.numbers);
        if (numbers.length !== 10) throw new Error(`Cartão ${i + 1}: precisa de 10 números`);
        if (new Set(numbers).size !== 10) throw new Error(`Cartão ${i + 1}: números repetidos`);
        if (numbers.some((n) => n < 0 || n > 99)) throw new Error(`Cartão ${i + 1}: números fora de 0–99`);
        if (!d.player_name.trim()) throw new Error(`Cartão ${i + 1}: nome obrigatório`);
        return {
          draw_id: draw.data!.id,
          card_number: nextCardNumber(i),
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
      invalidateCards();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cartão removido"); invalidateCards(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCard = useMutation({
    mutationFn: async () => {
      const v = validateNumbers(editNumbers);
      if (!v.ok) throw new Error(v.msg || "Números inválidos");
      if (!editName.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase
        .from("cards")
        .update({ player_name: editName.trim(), numbers: v.nums! })
        .eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      toast.success("Cartão atualizado");
      invalidateCards();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function startEdit(c: any) {
    setEditingId(c.card_id);
    setEditName(c.player_name);
    setEditNumbers(c.numbers.map(fmt2).join(", "));
  }

  const editV = validateNumbers(editNumbers);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display">Cartões</h1>
        <p className="text-sm text-muted-foreground">Cadastre os jogadores do sorteio ativo.</p>
      </div>

      {!draw.data ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card text-sm text-muted-foreground">
          Nenhum sorteio ativo — crie um em "Sorteios".
        </div>
      ) : (
        <>
          {/* === FORMULÁRIO DE NOVOS CARTÕES === */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
            {drafts.map((d, i) => (
              <div key={i} className="grid md:grid-cols-12 gap-2 items-start">
                {/* Nº gerado automaticamente */}
                <div className="md:col-span-1 flex items-center pt-6">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{nextCardNumber(i)}
                  </span>
                </div>

                {/* Nome */}
                <div className="md:col-span-4">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do jogador"
                    value={d.player_name}
                    onChange={(e) =>
                      setDrafts((a) => a.map((x, j) => j === i ? { ...x, player_name: e.target.value } : x))
                    }
                  />
                </div>

                {/* Números */}
                <div className="md:col-span-6">
                  <Label>10 números (0–99, separados por vírgula)</Label>
                  <Input
                    placeholder="01, 07, 12, 23, 34, 45, 56, 67, 78, 89"
                    value={d.numbers}
                    onChange={(e) =>
                      setDrafts((a) => a.map((x, j) => j === i ? { ...x, numbers: e.target.value } : x))
                    }
                  />
                  <NumbersValidation value={d.numbers} />
                </div>

                {/* Remover rascunho */}
                <div className="md:col-span-1 flex items-center pt-6">
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
              <Button onClick={() => save.mutate()} disabled={save.isPending || !canSave}>
                Salvar cartões
              </Button>
            </div>
          </div>

          {/* === LISTA DE CARTÕES === */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="font-display text-lg mb-3">
              Cartões do sorteio ({existingCount})
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-2">Cartão</th>
                    <th className="px-2 py-2">Jogador</th>
                    <th className="px-2 py-2">Números</th>
                    <th className="px-2 py-2 text-right">Acertos</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(cards.data ?? []).map((c: any) => (
                    <tr key={c.card_id} className="border-t border-border">
                      <td className="px-2 py-2 font-mono">{c.card_number}</td>
                      <td className="px-2 py-2 font-medium">{c.player_name}</td>
                      <td className="px-2 py-2 text-muted-foreground font-mono text-xs">
                        {c.numbers.map(fmt2).join(" ")}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">{c.hits}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(c)}
                          >
                            <Pencil className="size-3.5 mr-1" /> Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3.5 mr-1" /> Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cartão {c.card_number}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O cartão de <strong>{c.player_name}</strong> será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => deleteCard.mutate(c.card_id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!existingCount && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum cartão cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* === MODAL DE EDIÇÃO === */}
      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar cartão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do jogador</Label>
              <Input
                className="mt-1"
                placeholder="Nome do jogador"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label>10 números (0–99, separados por vírgula)</Label>
              <Input
                className="mt-1 font-mono"
                placeholder="01, 07, 12, 23, 34, 45, 56, 67, 78, 89"
                value={editNumbers}
                onChange={(e) => setEditNumbers(e.target.value)}
              />
              <NumbersValidation value={editNumbers} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateCard.mutate()}
              disabled={!editV.ok || !editName.trim() || updateCard.isPending}
            >
              {updateCard.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CartoesPage;
