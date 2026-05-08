
-- 1. View com security_invoker
drop view if exists public.card_hits;
create view public.card_hits
with (security_invoker = true) as
select
  c.id as card_id,
  c.draw_id,
  c.card_number,
  c.player_name,
  c.numbers,
  coalesce((
    select count(*)::int
    from unnest(c.numbers) n
    where n in (select number from public.draw_numbers where draw_id = c.draw_id)
  ), 0) as hits
from public.cards c;

-- 2. Search path na função de validação
create or replace function public.validate_card_numbers()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if array_length(NEW.numbers,1) <> 10 then
    raise exception 'cartão deve ter exatamente 10 números';
  end if;
  if exists (select 1 from unnest(NEW.numbers) n where n < 0 or n > 99) then
    raise exception 'números do cartão devem estar entre 0 e 99';
  end if;
  if (select count(distinct n) from unnest(NEW.numbers) n) <> 10 then
    raise exception 'números do cartão não podem se repetir';
  end if;
  return NEW;
end $$;

-- 3. Revogar execução pública de funções que não devem ser chamadas via API
revoke execute on function public.resolve_winners_after_number() from public, anon, authenticated;
revoke execute on function public.add_draw_number(uuid, smallint) from public, anon;
-- has_role precisa permanecer executável para RLS funcionar
