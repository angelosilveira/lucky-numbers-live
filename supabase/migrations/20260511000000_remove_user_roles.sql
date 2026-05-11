-- Drop policies that depend on has_role
drop policy if exists "admin all draws"        on public.draws;
drop policy if exists "admin all draw_numbers" on public.draw_numbers;
drop policy if exists "admin all cards"        on public.cards;
drop policy if exists "admin all winners"      on public.winners;
drop policy if exists "admin update settings"  on public.settings;
drop policy if exists "self read role"         on public.user_roles;
drop policy if exists "admin read user_roles"  on public.user_roles;
drop policy if exists "self read profile"      on public.profiles;
drop policy if exists "admin read profiles"    on public.profiles;

-- New policies: any authenticated user can write
create policy "auth all draws"        on public.draws        for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth all draw_numbers" on public.draw_numbers for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth all cards"        on public.cards        for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth all winners"      on public.winners      for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth update settings"  on public.settings     for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth read profile"     on public.profiles     for select to authenticated using (auth.uid() = id);

-- Update add_draw_number to check only authentication
create or replace function public.add_draw_number(p_draw uuid, p_number smallint)
returns void language plpgsql security definer set search_path = public as $$
declare v_pos int;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;
  if (select status from public.draws where id = p_draw) <> 'active' then
    raise exception 'sorteio não está ativo';
  end if;
  select coalesce(max(position),0)+1 into v_pos from public.draw_numbers where draw_id = p_draw;
  if v_pos > 10 then
    raise exception 'limite de 10 números atingido';
  end if;
  insert into public.draw_numbers(draw_id, number, position) values (p_draw, p_number, v_pos);
end $$;

-- Drop user_roles table, has_role function and app_role enum
drop table if exists public.user_roles;
drop function if exists public.has_role(uuid, public.app_role);
drop type if exists public.app_role;
