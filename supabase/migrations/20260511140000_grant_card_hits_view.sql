-- Concede leitura da view card_hits para anon e authenticated
-- (a view usa security_invoker, então as RLS das tabelas base ainda se aplicam)
grant select on public.card_hits to anon;
grant select on public.card_hits to authenticated;

-- Garante grants das novas RPCs de batch/edit/delete
grant execute on function public.add_draw_numbers_batch(uuid, smallint[], timestamptz) to authenticated;
grant execute on function public.delete_draw_round(uuid, uuid)                          to authenticated;
grant execute on function public.update_draw_round(uuid, uuid, smallint[], timestamptz) to authenticated;
