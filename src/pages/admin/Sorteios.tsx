import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { CheckCircle2, XCircle, Clock, Calendar, Trophy, Pencil, Trash2, X } from "lucide-react";

({
  component: SorteiosPage,
});

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function validateNumbers(input: string) {
  if (!input.trim()) return null;
  const parts = input.split(/[\s,;]+/).filter((s) => s.trim().length > 0);
  const parsed = parts.map((s) => {
    const n = parseInt(s.trim(), 10);
    return isNaN(n) ? null : n;
  });
  if (parsed.some((n) => n === null))
    return { ok: false as const, msg: "Entrada inválida — use apenas números separados por espaço ou vírgula", nums: null };
  const nums = parsed as number[];
  if (nums.some((n) => n < 0 || n > 99))
    return { ok: false as const, msg: "Todos os números devem estar entre 0 e 99", nums: null };
  if (new Set(nums).size !== nums.length)
    return { ok: false as const, msg: "Há números repetidos na rodada", nums: null };
  if (nums.length < 10)
    return { ok: false as const, msg: `${nums.length}/10 números — adicione mais ${10 - nums.length}`, nums: null };
  if (nums.length > 10)
    return { ok: false as const, msg: `${nums.length}/10 — remova ${nums.length - 10} número(s)`, nums: null };
  return { ok: true as const, msg: "10 números válidos — pronto!", nums };
}

function NumberBadges({ input }: { input: string }) {
  const parts = input.trim()
    ? input.split(/[\s,;]+/).filter((s) => s.trim().length > 0)
    : [];
  if (!parts.length) return null;
  const parsed = parts.map((s) => { const n = parseInt(s, 10); return isNaN(n) ? null : n; });
  return (
    <div className="flex flex-wrap gap-2">
      {parsed.map((n, i) => {
        const isDupe = n !== null && parsed.indexOf(n) !== i;
        const bad = n === null || n < 0 || n > 99 || isDupe;
        return (
          <span key={i} className={
            "size-10 rounded-md font-display text-base flex items-center justify-center " +
            (bad ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary")
          }>
            {n === null ? "?" : fmt2(n)}
          </span>
        );
      })}
    </div>
  );
}

function ValidationMsg({ input }: { input: string }) {
  const v = validateNumbers(input);
  if (!v || !input.trim()) return null;
  return (
    <div className={"flex items-center gap-2 text-sm " + (v.ok ? "text-green-500" : "text-destructive")}>
      {v.ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
      {v.msg}
    </div>
  );
}

function RoundForm({
  title,
  date, setDate,
  time, setTime,
  numbersInput, setNumbersInput,
  onSubmit, onCancel,
  isPending, submitLabel,
}: {
  title: string;
  date: string; setDate: (v: string) => void;
  time: string; setTime: (v: string) => void;
  numbersInput: string; setNumbersInput: (v: string) => void;
  onSubmit: () => void; onCancel?: () => void;
  isPending: boolean; submitLabel: string;
}) {
  const v = validateNumbers(numbersInput);
  return (
    <div className="space-y-4">
      <div className="font-display text-lg">{title}</div>
      <div className="grid sm:grid-cols-2 gap-4 max-w-sm">
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5">
            <Calendar className="size-3.5" /> Data da rodada
          </Label>
          <Input type="date" value={date} max={todayDateStr()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5">
            <Clock className="size-3.5" /> Horário da rodada
          </Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="mb-1.5 block">
          10 números sorteados
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            separados por espaço ou vírgula
          </span>
        </Label>
        <Input
          className="font-mono text-base tracking-widest max-w-lg"
          inputMode="numeric"
          placeholder="01 43 53 63 10 22 33 44 55 66"
          value={numbersInput}
          onChange={(e) => setNumbersInput(e.target.value)}
        />
      </div>
      {numbersInput.trim() && (
        <div className="space-y-2">
          <NumberBadges input={numbersInput} />
          <ValidationMsg input={numbersInput} />
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={!v?.ok || isPending}>
          {isPending ? "Salvando…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            <X className="size-4 mr-1" /> Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

function SorteiosPage() {
  const qc = useQueryClient();
  const draw = useActiveDraw();
  const settings = useSettings();
  const numbers = useDrawnNumbers(draw.data?.id);
  const history = useDrawHistory();

  // --- criar sorteio ---
  const [startDate, setStartDate] = useState(todayDateStr);
  const [startTime, setStartTime] = useState("21:00");

  // --- registrar rodada ---
  const [roundDate, setRoundDate] = useState(todayDateStr);
  const [roundTime, setRoundTime] = useState(nowTimeStr);
  const [numbersInput, setNumbersInput] = useState("");

  // --- editar rodada ---
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editNumbers, setEditNumbers] = useState("");

  // Agrupa por batch_id; fallback por blocos de 10 posições para registros sem batch_id
  const rounds = useMemo(() => {
    const sorted = [...(numbers.data ?? [])].sort((a: any, b: any) => a.position - b.position);
    const byBatch = new Map<string, any[]>();
    const legacy: any[] = [];
    for (const n of sorted) {
      if (n.batch_id) {
        if (!byBatch.has(n.batch_id)) byBatch.set(n.batch_id, []);
        byBatch.get(n.batch_id)!.push(n);
      } else {
        legacy.push(n);
      }
    }
    const result: any[][] = [...byBatch.values()];
    for (let i = 0; i < legacy.length; i += 10) result.push(legacy.slice(i, i + 10));
    return result.sort((a, b) => a[0].position - b[0].position);
  }, [numbers.data]);

  const totalDrawn = (numbers.data ?? []).length;

  const dtFmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  function invalidateNumbers() {
    qc.invalidateQueries({ queryKey: ["drawn-numbers", draw.data?.id] });
    qc.invalidateQueries({ queryKey: ["card-hits", draw.data?.id] });
    qc.invalidateQueries({ queryKey: ["winners", draw.data?.id] });
  }

  const createDraw = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("draws").insert({
        scheduled_at: new Date(`${startDate}T${startTime}:00`).toISOString(),
        prize_amount: Number(settings.data?.prize_amount ?? 0),
        card_price: Number(settings.data?.card_price ?? 10),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sorteio criado"); qc.invalidateQueries(); },
    onError: (e: any) =>
      toast.error(e.message?.includes("draws_one_active") || e.code === "23505"
        ? "Já existe um sorteio ativo" : e.message),
  });

  const addBatch = useMutation({
    mutationFn: async () => {
      const v = validateNumbers(numbersInput);
      if (!v?.ok) throw new Error("Dados inválidos");
      const { error } = await supabase.rpc("add_draw_numbers_batch", {
        p_draw: draw.data!.id,
        p_numbers: v.nums!,
        p_drawn_at: new Date(`${roundDate}T${roundTime}:00`).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNumbersInput("");
      toast.success("Rodada registrada!");
      invalidateNumbers();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRound = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase.rpc("delete_draw_round", {
        p_draw: draw.data!.id,
        p_batch_id: batchId,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rodada removida"); invalidateNumbers(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRound = useMutation({
    mutationFn: async () => {
      const v = validateNumbers(editNumbers);
      if (!v?.ok) throw new Error("Dados inválidos");
      const { error } = await supabase.rpc("update_draw_round", {
        p_draw: draw.data!.id,
        p_batch_id: editingBatchId!,
        p_numbers: v.nums!,
        p_drawn_at: new Date(`${editDate}T${editTime}:00`).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingBatchId(null);
      toast.success("Rodada atualizada!");
      invalidateNumbers();
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

  function startEdit(round: any[]) {
    const first = round[0];
    const dt = new Date(first.drawn_at);
    setEditingBatchId(first.batch_id ?? null);
    setEditDate(dt.toISOString().slice(0, 10));
    setEditTime(`${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`);
    setEditNumbers(round.map((n: any) => fmt2(n.number)).join(" "));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display">Sorteios</h1>
        <p className="text-sm text-muted-foreground">Gerencie sorteio ativo e histórico.</p>
      </div>

      {/* === CRIAR SORTEIO === */}
      {!draw.data ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card max-w-lg">
          <div className="font-display text-lg mb-4">Criar novo sorteio</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Calendar className="size-3.5" /> Data de início
              </Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Clock className="size-3.5" /> Horário de início
              </Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Valor do cartão e prêmio base serão lidos das Configurações.
          </p>
          <Button className="mt-4" onClick={() => createDraw.mutate()} disabled={createDraw.isPending}>
            Criar sorteio
          </Button>
        </div>
      ) : (
        <>
          {/* === CABEÇALHO DO SORTEIO ATIVO === */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Sorteio ativo</div>
                <div className="font-display text-xl">{formatDateTime(draw.data.scheduled_at)}</div>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{totalDrawn} número{totalDrawn !== 1 ? "s" : ""} sorteado{totalDrawn !== 1 ? "s" : ""}</span>
                  <span>{rounds.length} rodada{rounds.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">Finalizar sorteio</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalizar este sorteio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Após finalizado não será possível adicionar ou editar rodadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => finalize.mutate()}>Finalizar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* === RODADAS REGISTRADAS === */}
          {rounds.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="font-display text-lg mb-4">
                Rodadas registradas
                <span className="ml-2 text-sm font-sans font-normal text-muted-foreground">
                  {rounds.length} rodada{rounds.length !== 1 ? "s" : ""} · {totalDrawn} números
                </span>
              </div>
              <div className="space-y-4">
                {rounds.map((round, idx) => {
                  const batchId = round[0]?.batch_id ?? null;
                  const isEditing = editingBatchId !== null && editingBatchId === batchId;
                  const drawnAt = round[0]?.drawn_at ? dtFmt.format(new Date(round[0].drawn_at)) : "";

                  if (isEditing) {
                    return (
                      <div key={batchId ?? idx} className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                        <RoundForm
                          title={`Editando Rodada ${idx + 1}`}
                          date={editDate} setDate={setEditDate}
                          time={editTime} setTime={setEditTime}
                          numbersInput={editNumbers} setNumbersInput={setEditNumbers}
                          onSubmit={() => updateRound.mutate()}
                          onCancel={() => setEditingBatchId(null)}
                          isPending={updateRound.isPending}
                          submitLabel="Salvar alterações"
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={batchId ?? idx} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="size-3.5 text-gold" />
                          <span className="text-sm font-medium">Rodada {idx + 1}</span>
                          <span className="text-xs text-muted-foreground">{drawnAt}</span>
                        </div>
                        {batchId && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => startEdit(round)}
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
                                  <AlertDialogTitle>Excluir Rodada {idx + 1}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Os 10 números desta rodada serão removidos. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => deleteRound.mutate(batchId)}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {round.map((n: any) => (
                          <span
                            key={n.position}
                            className="size-10 rounded-md bg-primary/20 text-primary font-display text-base flex items-center justify-center"
                          >
                            {fmt2(n.number)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === REGISTRAR NOVA RODADA === */}
          {totalDrawn < 100 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card max-w-2xl">
              <RoundForm
                title="Registrar rodada"
                date={roundDate} setDate={setRoundDate}
                time={roundTime} setTime={setRoundTime}
                numbersInput={numbersInput} setNumbersInput={setNumbersInput}
                onSubmit={() => addBatch.mutate()}
                isPending={addBatch.isPending}
                submitLabel="Registrar rodada"
              />
            </div>
          )}
        </>
      )}

      {/* === HISTÓRICO === */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="font-display text-lg mb-3">Histórico de sorteios</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Data</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Prêmio</th>
              </tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((d: any) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-2">{formatDateTime(d.scheduled_at)}</td>
                  <td className="py-2">
                    <span className={
                      "px-2 py-0.5 rounded text-xs font-medium " +
                      (d.status === "active" ? "bg-blue-500/15 text-blue-400"
                        : d.status === "finalized" ? "bg-green-500/15 text-green-400"
                        : "bg-muted text-muted-foreground")
                    }>
                      {d.status === "active" ? "Ativo" : d.status === "finalized" ? "Finalizado" : "Cancelado"}
                    </span>
                  </td>
                  <td className="py-2 text-right">{brl(Number(d.prize_amount))}</td>
                </tr>
              ))}
              {!(history.data ?? []).length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">Nenhum sorteio ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SorteiosPage;
