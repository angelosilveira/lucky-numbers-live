import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Draw = {
  id: string;
  scheduled_at: string;
  status: "active" | "finalized" | "cancelled";
  prize_amount: number;
  card_price: number;
  created_at: string;
  finalized_at: string | null;
};

export function useActiveDraw() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["active-draw"],
    queryFn: async (): Promise<Draw | null> => {
      const { data, error } = await supabase
        .from("draws")
        .select("*")
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as Draw | null;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const ch = supabase
      .channel("draws-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "draws" }, () => {
        qc.invalidateQueries({ queryKey: ["active-draw"] });
        qc.invalidateQueries({ queryKey: ["draws-history"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return q;
}

export function useDrawnNumbers(drawId?: string | null) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["drawn-numbers", drawId],
    enabled: !!drawId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_numbers")
        .select("number, position, drawn_at")
        .eq("draw_id", drawId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!drawId) return;
    const ch = supabase
      .channel(`numbers-${drawId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draw_numbers", filter: `draw_id=eq.${drawId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["drawn-numbers", drawId] });
          qc.invalidateQueries({ queryKey: ["card-hits", drawId] });
          qc.invalidateQueries({ queryKey: ["winners", drawId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [drawId, qc]);

  return q;
}

export function useCards(drawId?: string | null) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["card-hits", drawId],
    enabled: !!drawId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_hits")
        .select("*")
        .eq("draw_id", drawId!);
      if (error) throw error;
      return (data ?? []).sort((a: any, b: any) => b.hits - a.hits);
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!drawId) return;
    const ch = supabase
      .channel(`cards-${drawId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards", filter: `draw_id=eq.${drawId}` },
        () => qc.invalidateQueries({ queryKey: ["card-hits", drawId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [drawId, qc]);

  return q;
}

export function useWinners(drawId?: string | null) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["winners", drawId],
    enabled: !!drawId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("winners")
        .select("id, hits, prize_share, won_at, cards(card_number, player_name)")
        .eq("draw_id", drawId!)
        .order("won_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!drawId) return;
    const ch = supabase
      .channel(`winners-${drawId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "winners", filter: `draw_id=eq.${drawId}` },
        () => qc.invalidateQueries({ queryKey: ["winners", drawId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [drawId, qc]);

  return q;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDrawHistory() {
  return useQuery({
    queryKey: ["draws-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draws")
        .select("id, scheduled_at, status, prize_amount, finalized_at")
        .order("scheduled_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}
