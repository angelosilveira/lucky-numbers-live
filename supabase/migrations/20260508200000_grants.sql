
-- Leitura pública (anon)
grant select on public.draws        to anon;
grant select on public.draw_numbers to anon;
grant select on public.cards        to anon;
grant select on public.winners      to anon;
grant select on public.settings     to anon;

-- Acesso autenticado (RLS já restringe às linhas permitidas)
grant select, insert, update, delete on public.draws        to authenticated;
grant select, insert, update, delete on public.draw_numbers to authenticated;
grant select, insert, update, delete on public.cards        to authenticated;
grant select, insert, update, delete on public.winners      to authenticated;
grant select, update                 on public.settings     to authenticated;
grant select                         on public.user_roles   to authenticated;
grant select                         on public.profiles     to authenticated;

-- RPC admin
grant execute on function public.add_draw_number(uuid, smallint) to authenticated;
