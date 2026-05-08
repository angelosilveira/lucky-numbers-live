# Jogo do Bicho — Conferência Realtime

Aplicação full-stack para conferência ao vivo do jogo do bicho, com página pública estilo cassino e painel administrativo minimalista. Stack: TanStack Start (equivalente Next.js no template Lovable) + React + TS + Tailwind v4 + Shadcn + Framer Motion + React Query + RHF + Zod + Lovable Cloud (Supabase: Postgres, Auth, Realtime).

> Observação técnica: o template Lovable usa **TanStack Start** (não Next.js). A arquitetura abaixo respeita isso — server functions substituem API routes do Next, mas a divisão lógica é equivalente.

---

## 1. Visão geral da arquitetura

```text
┌──────────────────────────────────────────────────────────────┐
│                      CLIENTE (Mobile-first)                  │
│  Página pública /            Admin /admin/*                  │
│  - Grade 00-99 realtime      - Login CPF+senha               │
│  - Stats / Ranking / Win.    - Dashboard, jogos, sorteios    │
└──────────────────────────────────────────────────────────────┘
              │  React Query + Supabase Realtime (WS)
              ▼
┌──────────────────────────────────────────────────────────────┐
│                  SERVER FUNCTIONS (TanStack)                 │
│  - createDraw, addNumber, finalizeDraw                       │
│  - createCards (batch), reports, exports                     │
│  - middleware: requireSupabaseAuth + requireAdmin            │
└──────────────────────────────────────────────────────────────┘
              │ supabase-js (RLS user) / supabaseAdmin (server)
              ▼
┌──────────────────────────────────────────────────────────────┐
│              SUPABASE (Postgres + Auth + Realtime)           │
│  Tabelas + Triggers + RPC + RLS + Publication realtime       │
└──────────────────────────────────────────────────────────────┘
```

Princípios:
- Toda regra crítica (acertos, vencedores, divisão de prêmio) roda em **trigger SQL**, nunca no cliente.
- Cliente apenas lê via Realtime e renderiza.
- Admin único: flag em tabela `user_roles` (role enum), nunca em `profiles`.
- Apenas 1 sorteio `active` por vez: índice parcial único.

---

## 2. Estrutura de pastas

```text
src/
  routes/
    __root.tsx
    index.tsx                     # página pública
    login.tsx                     # CPF + senha
    _authenticated.tsx            # guard admin
    _authenticated/
      admin.tsx                   # layout admin (sidebar)
      admin/index.tsx             # dashboard
      admin/sorteios.tsx
      admin/sorteios.$id.tsx
      admin/cartoes.tsx
      admin/jogadores.tsx
      admin/relatorios.tsx
      admin/configuracoes.tsx
    api/public/health.ts
  components/
    public/
      NumberGrid.tsx
      LiveStats.tsx
      LeadersBoard.tsx
      WinnersPanel.tsx
      DrawHistory.tsx
      CardsTable.tsx
    admin/
      Sidebar.tsx
      KpiCard.tsx
      RevenueChart.tsx
      DrawForm.tsx
      DrawNumberInput.tsx
      CardForm.tsx
      CardBatchBuilder.tsx
      ConfirmFinalizeDialog.tsx
    ui/ (shadcn)
  hooks/
    useActiveDraw.ts
    useDrawnNumbers.ts
    useLeaders.ts
    useWinners.ts
    useRealtimeChannel.ts
    useAuth.ts
    useIsAdmin.ts
  lib/
    draws.functions.ts            # server fns (jogos/sorteios)
    cards.functions.ts
    reports.functions.ts
    auth.functions.ts
    validators.ts                 # zod schemas
    format.ts                     # money/cpf/date
    pdf/                          # futuro: react-pdf
    whatsapp/                     # futuro: wa share helpers
  integrations/supabase/
    client.ts
    client.server.ts
    auth-middleware.ts
    admin-middleware.ts           # estende requireSupabaseAuth + checa role
  styles.css
```

---

## 3. Modelagem do banco (PostgreSQL / Supabase)

### 3.1 Enums e tabelas

```sql
-- Roles separados (NUNCA na tabela profiles)
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

-- Perfil mínimo (CPF do admin para login)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  cpf text unique not null check (cpf ~ '^[0-9]{11}$'),
  name text,
  created_at timestamptz default now()
);

-- Configurações globais (1 linha)
create table public.settings (
  id boolean primary key default true check (id),
  card_price numeric(10,2) not null default 10.00,
  prize_amount numeric(12,2) not null default 0,
  updated_at timestamptz default now()
);
insert into public.settings(id) values (true) on conflict do nothing;

-- Sorteios
create type public.draw_status as enum ('active','finalized','cancelled');

create table public.draws (
  id uuid primary key default gen_random_uuid(),
  scheduled_at timestamptz not null,           -- ex: 21:00 do dia
  status public.draw_status not null default 'active',
  prize_amount numeric(12,2) not null,         -- snapshot do prêmio
  card_price  numeric(10,2) not null,          -- snapshot
  created_by uuid references auth.users(id),
  finalized_at timestamptz,
  created_at timestamptz default now()
);
-- apenas 1 sorteio ativo por vez
create unique index draws_one_active on public.draws ((status))
  where status = 'active';

-- Números sorteados (00..99 por sorteio, máx 10)
create table public.draw_numbers (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  number smallint not null check (number between 0 and 99),
  position smallint not null check (position between 1 and 10),
  drawn_at timestamptz not null default now(),
  unique (draw_id, number),
  unique (draw_id, position)
);

-- Cartões cadastrados pelo admin
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  card_number text not null,
  player_name text not null,
  numbers smallint[] not null check (
    array_length(numbers,1) = 10
    and (select bool_and(n between 0 and 99) from unnest(numbers) n)
    and (select count(distinct n) from unnest(numbers) n) = 10
  ),
  price numeric(10,2) not null,
  created_at timestamptz default now(),
  unique (draw_id, card_number)
);
create index cards_draw_idx on public.cards(draw_id);

-- Vencedores (preenchido por trigger)
create table public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  card_id  uuid not null references public.cards(id) on delete cascade,
  hits smallint not null,
  won_at timestamptz not null default now(),
  prize_share numeric(12,2) not null,
  unique (draw_id, card_id)
);
```

### 3.2 View de ranking (acertos em tempo real)

```sql
create or replace view public.card_hits as
select
  c.id as card_id,
  c.draw_id,
  c.card_number,
  c.player_name,
  c.numbers,
  coalesce(cardinality(array(
    select unnest(c.numbers)
    intersect
    select dn.number from public.draw_numbers dn where dn.draw_id = c.draw_id
  )),0) as hits
from public.cards c;
```

### 3.3 Lógica de vitória (trigger)

Vencedor = primeiro(s) cartão(ões) que atingem 10 acertos no mesmo `draw_numbers.drawn_at`. Se múltiplos batem 10 ao mesmo número sorteado → empate → divisão igual.

```sql
create or replace function public.resolve_winners_after_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prize numeric(12,2);
  v_count int;
begin
  -- candidatos que ficaram com 10 acertos AGORA
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
```

> Importante: o **empate só conta entre cartões que completaram 10 no MESMO número sorteado** (mesmo INSERT). Cartões que completam em sorteios de números seguintes entram em rodadas posteriores como novos vencedores (raramente acontece, pois sorteio finaliza ao haver vencedor — o admin pode encerrar via UI).

### 3.4 RPC para admin inserir número (validação atômica)

```sql
create or replace function public.add_draw_number(p_draw uuid, p_number smallint)
returns void language plpgsql security definer set search_path = public as $$
declare v_pos int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if (select status from draws where id=p_draw) <> 'active' then
    raise exception 'draw not active';
  end if;
  select coalesce(max(position),0)+1 into v_pos from draw_numbers where draw_id=p_draw;
  if v_pos > 10 then raise exception 'max 10 numbers'; end if;
  insert into draw_numbers(draw_id,number,position) values (p_draw,p_number,v_pos);
end $$;
```

### 3.5 Função de role (evita recursão RLS)

```sql
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;
```

### 3.6 RLS

```sql
alter table profiles      enable row level security;
alter table user_roles    enable row level security;
alter table settings      enable row level security;
alter table draws         enable row level security;
alter table draw_numbers  enable row level security;
alter table cards         enable row level security;
alter table winners       enable row level security;

-- LEITURA PÚBLICA (página pública é anônima)
create policy "public read draws"        on draws        for select using (true);
create policy "public read draw_numbers" on draw_numbers for select using (true);
create policy "public read cards"        on cards        for select using (true);
create policy "public read winners"      on winners      for select using (true);
create policy "public read settings"     on settings     for select using (true);

-- ESCRITA SOMENTE ADMIN
create policy "admin write draws"       on draws       for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create policy "admin write numbers"     on draw_numbers for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create policy "admin write cards"       on cards        for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create policy "admin write settings"    on settings     for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create policy "admin read user_roles"   on user_roles   for select using (has_role(auth.uid(),'admin'));
create policy "self read profile"       on profiles     for select using (auth.uid() = id);
```

### 3.7 Realtime

```sql
alter publication supabase_realtime add table draws, draw_numbers, cards, winners, settings;
```

Cliente assina canais filtrados por `draw_id` ativo.

---

## 4. Autenticação (CPF + senha, 1 admin)

- Supabase Auth não aceita CPF nativo → estratégia: cadastrar admin com email sintético `cpf+<cpf>@bicho.local` e senha definida.
- Tela de login coleta CPF+senha; cliente monta o email e chama `supabase.auth.signInWithPassword`.
- Após login: hook `useIsAdmin` checa via `has_role`. Se falso → logout + erro.
- Guard de rota: `_authenticated.tsx` faz `beforeLoad` validando sessão e admin.

---

## 5. Server Functions (principais)

`src/lib/draws.functions.ts`
- `createDraw({ scheduledAt, prizeAmount })`
- `addDrawNumber({ drawId, number })` → chama RPC `add_draw_number`
- `finalizeDraw({ drawId })` → seta `status='finalized'`, `finalized_at=now()`
- `getActiveDraw()`

`src/lib/cards.functions.ts`
- `createCardsBatch({ drawId, cards: [{cardNumber, name, numbers}] })` → calcula total = `card_price * n`
- `listCards({ drawId })`

`src/lib/reports.functions.ts` (futuro)
- `revenueDaily/Monthly/Yearly`
- `exportDrawPdf({ drawId })`
- `exportCardReceiptPdf({ cardId })`

Todas com `requireSupabaseAuth` + checagem `has_role admin` no handler.

---

## 6. Estratégia Realtime no cliente

Hook único `useActiveDraw`:
1. `useQuery(['active-draw'])` → busca sorteio ativo.
2. `supabase.channel('draw:'+id)` assina `draw_numbers`, `cards`, `winners`, `draws`.
3. Em qualquer evento: `queryClient.invalidateQueries`.
4. `useDrawnNumbers`, `useLeaders` (top 10 por `card_hits`), `useWinners` derivam do cache.

Otimização:
- `staleTime` infinito + invalidação por evento.
- Animação Framer Motion ao chegar novo número (grid + sons opcionais).

---

## 7. UI / Identidade visual

### 7.1 Página pública — "Cassino premium"
- Paleta (oklch):
  - `--background` #0A0A12 (quase preto azulado)
  - `--foreground` #F5F5FA
  - `--primary` dourado neon `oklch(0.82 0.17 90)`
  - `--accent` roxo neon `oklch(0.65 0.25 300)`
  - `--success` verde neon `oklch(0.78 0.22 145)`
  - `--danger` vermelho rubi `oklch(0.62 0.24 25)`
- Gradients: `--gradient-hero: linear-gradient(135deg,#1a0033,#000814 50%,#1a1a00)`.
- Glow tokens: `--shadow-glow-gold: 0 0 24px oklch(0.82 0.17 90 / .55)`.
- Tipografia: display **"Unbounded"** ou **"Sora"**; corpo **"Inter Tight"**.
- Componentes:
  - `NumberCell`: 64px mobile, glow ao ser sorteado, flip 3D Framer Motion.
  - `KpiTile` com gradiente + contador animado (`react-countup`).
  - Tabelas com row highlight verde quando hits sobe.

### 7.2 Admin — "Clean produtividade"
- Paleta clara + dark mode:
  - `--background` #FAFAFA / dark #0F1115
  - `--primary` azul corporativo `oklch(0.55 0.15 255)`
  - bordas suaves, sombras discretas.
- Tipografia: **Inter** + **JetBrains Mono** para números.
- Sidebar fixa desktop, bottom nav mobile.
- Charts: Recharts (já vem com shadcn/ui).

---

## 8. Fluxos

1. **Pública**: load → busca draw ativo → assina realtime → renderiza grid/stats/leaders/winners/history. Sem login.
2. **Login admin**: CPF+senha → email sintético → session → guard `_authenticated` valida `has_role`.
3. **Sorteio**: admin cria → status `active` (índice impede 2º) → adiciona números 1..10 via RPC → trigger detecta vencedores → admin finaliza (modal de confirmação) → status `finalized`, escrita bloqueada via policy adicional `using (status='active')` para `draw_numbers`.
4. **Realtime**: trigger insere em `winners` → publication emite → clientes invalidam → painel "Ganhadores" anima.
5. **Atualização de números**: RPC valida (admin, ativo, único, ≤10) → insere → realtime.
6. **Ganhadores**: derivado por trigger; UI mostra com `prize_share` já calculado.
7. **Financeiro**: `cards.price` somado por dia/mês/ano → views materializadas (futuro) ou agregação on-demand.
8. **Auth**: middleware server fn + guard rota + RLS.
9. **Relatórios**: server fn busca dados → `@react-pdf/renderer` gera Buffer → download.
10. **WhatsApp futuro**: 
    - Curto prazo: `wa.me/?text=` com link público do sorteio.
    - Médio prazo: WhatsApp Cloud API → server route `/api/public/wa-webhook` (verificada por assinatura) + tabela `wa_messages`.

---

## 9. Performance

- Índices: `draw_numbers(draw_id)`, `cards(draw_id)`, `winners(draw_id)`.
- View `card_hits` usa `intersect`; se crescer, materializar com refresh em trigger.
- React Query cache + Realtime invalidation evita polling.
- Code-split admin (rota lazy).
- Imagens em `src/assets` otimizadas; sem libs pesadas no bundle público.

---

## 10. Segurança

- RLS em todas tabelas; escrita só admin via `has_role`.
- Roles em tabela separada (impede privilege escalation).
- RPC `security definer` com `set search_path = public`.
- Validação Zod no client + checagem SQL (constraints).
- CPF apenas hash de exibição? Mantido em `profiles` com unique; acesso restrito via RLS `auth.uid() = id`.
- Sem service role no cliente; PDFs/relatórios via server fn.

---

## 11. Plano de implementação (fases)

| Fase | Entregáveis |
|---|---|
| 0 | Habilitar Lovable Cloud, criar admin, settings seed |
| 1 | Schema + RLS + triggers + realtime publication |
| 2 | Login CPF + guard admin |
| 3 | Página pública: grid + stats (realtime) |
| 4 | Cadastro de cartões (batch) + tabela pública |
| 5 | Gestão sorteio: criar, inserir números, finalizar (modal) |
| 6 | Vencedores + ranking realtime + animações |
| 7 | Dashboard admin (KPIs + charts) |
| 8 | Histórico de sorteios |
| 9 | Configurações (card_price, prize_amount) |
| 10 | Relatórios PDF + comprovantes |
| 11 | Compartilhar via `wa.me` |
| 12 | Integração WhatsApp Cloud API |

---

## 12. Sugestões futuras
- Multi-admin com permissões granulares.
- Sons/áudio narrando números (Web Audio API).
- PWA + push notifications (vencedor / novo número).
- App nativo via Capacitor.
- Auditoria (tabela `audit_log` por trigger).
- Antifraude: hash do conjunto de cartões antes do 1º número sorteado.

---

## Próximo passo
Posso começar pela **Fase 0–3** (Cloud + schema + login + página pública realtime com grid e stats), e seguir incrementalmente. Confirma para eu iniciar?