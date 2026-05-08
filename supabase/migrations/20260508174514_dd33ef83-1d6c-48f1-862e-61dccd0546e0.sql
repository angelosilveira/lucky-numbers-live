
-- ============ ENUMS ============
create type public.app_role as enum ('admin');
create type public.draw_status as enum ('active','finalized','cancelled');

-- ============ TABELAS ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  cpf text unique not null,
  name text,
  created_at timestamptz not null default now()
);

create table public.settings (
  id boolean primary key default true,
  card_price numeric(10,2) not null default 10.00,
  prize_amount numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = true)
);
insert into public.settings(id) values (true) on conflict do nothing;

create table public.draws (
  id uuid primary key default gen_random_uuid(),
  scheduled_at timestamptz not null,
  status public.draw_status not null default 'active',
  prize_amount numeric(12,2) not null,
  card_price numeric(10,2) not null,
  created_by uuid references auth.users(id),
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index draws_one_active on public.draws ((status)) where status = 'active';

create table public.draw_numbers (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  number smallint not null check (number between 0 and 99),
  position smallint not null check (position between 1 and 10),
  drawn_at timestamptz not null default now(),
  unique (draw_id, number),
  unique (draw_id, position)
);
create index draw_numbers_draw_idx on public.draw_numbers(draw_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  card_number text not null,
  player_name text not null,
  numbers smallint[] not null,
  price numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (draw_id, card_number)
);
create index cards_draw_idx on public.cards(draw_id);

-- validação dos números do cartão via trigger (mais flexível que CHECK)
create or replace function public.validate_card_numbers()
returns trigger language plpgsql as $$
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
create trigger trg_validate_card_numbers
before insert or update on public.cards
for each row execute function public.validate_card_numbers();

create table public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  hits smallint not null,
  prize_share numeric(12,2) not null,
  won_at timestamptz not null default now(),
  unique (draw_id, card_id)
);

-- ============ FUNÇÕES ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- View de acertos em tempo real
create or replace view public.card_hits as
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

-- Trigger: ao inserir número sorteado, detectar vencedores e dividir prêmio
create or replace function public.resolve_winners_after_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prize numeric(12,2);
  v_count int;
begin
  with candidates as (
    select c.id as card_id
    from public.cards c
    where c.draw_id = NEW.draw_id
      and (
        select count(*) from unnest(c.numbers) n
        where n in (select number from public.draw_numbers where draw_id = NEW.draw_id)
      ) = 10
      and not exists (select 1 from public.winners w where w.card_id = c.id)
  )
  select count(*) into v_count from candidates;

  if v_count > 0 then
    select prize_amount into v_prize from public.draws where id = NEW.draw_id;
    insert into public.winners(draw_id, card_id, hits, prize_share)
    select NEW.draw_id, card_id, 10, round(v_prize / v_count, 2)
    from candidates;
  end if;
  return NEW;
end $$;
create trigger trg_resolve_winners
after insert on public.draw_numbers
for each row execute function public.resolve_winners_after_number();

-- RPC para admin adicionar número sorteado
create or replace function public.add_draw_number(p_draw uuid, p_number smallint)
returns void language plpgsql security definer set search_path = public as $$
declare v_pos int;
begin
  if not public.has_role(auth.uid(), 'admin') then
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

-- ============ RLS ============
alter table public.profiles      enable row level security;
alter table public.user_roles    enable row level security;
alter table public.settings      enable row level security;
alter table public.draws         enable row level security;
alter table public.draw_numbers  enable row level security;
alter table public.cards         enable row level security;
alter table public.winners       enable row level security;

-- Leituras públicas (anon)
create policy "public read draws"        on public.draws        for select using (true);
create policy "public read draw_numbers" on public.draw_numbers for select using (true);
create policy "public read cards"        on public.cards        for select using (true);
create policy "public read winners"      on public.winners      for select using (true);
create policy "public read settings"     on public.settings     for select using (true);

-- Escrita admin
create policy "admin all draws"        on public.draws        for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin all draw_numbers" on public.draw_numbers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin all cards"        on public.cards        for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin all winners"      on public.winners      for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin update settings"  on public.settings     for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- profiles e user_roles
create policy "self read profile"      on public.profiles   for select to authenticated using (auth.uid() = id);
create policy "admin read profiles"    on public.profiles   for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "self read role"         on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admin read user_roles"  on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ REALTIME ============
alter table public.draws         replica identity full;
alter table public.draw_numbers  replica identity full;
alter table public.cards         replica identity full;
alter table public.winners       replica identity full;
alter table public.settings      replica identity full;

alter publication supabase_realtime add table public.draws;
alter publication supabase_realtime add table public.draw_numbers;
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.winners;
alter publication supabase_realtime add table public.settings;
