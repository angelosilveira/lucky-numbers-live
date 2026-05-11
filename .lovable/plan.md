
# Migração para SPA (Vite + React Router) — Deploy Vercel

O projeto atualmente usa **TanStack Start** com SSR rodando em Cloudflare Workers (`app.config.ts`, `src/server.ts`, `wrangler.toml`). Para simplificar o deploy na Vercel como **SPA estática**, vou converter toda a camada de roteamento e remover a infraestrutura de servidor.

## O que muda

### 1. Stack de roteamento
- **Remover**: `@tanstack/react-start`, `@tanstack/react-router` (file-based), `routeTree.gen.ts`, `src/router.tsx`, `src/start.ts`, `src/server.ts`, `src/routes/__root.tsx` (shell HTML).
- **Adicionar**: `react-router-dom` v6 com `BrowserRouter` + `<Routes>`/`<Route>`.
- Criar `src/main.tsx` (entry SPA) e `index.html` na raiz (padrão Vite).
- Criar `src/App.tsx` com a árvore de rotas.

### 2. Conversão de rotas
Todos os arquivos em `src/routes/` viram componentes de página em `src/pages/`:

```text
src/routes/index.tsx                          -> src/pages/Home.tsx              (/)
src/routes/login.tsx                          -> src/pages/Login.tsx             (/login)
src/routes/_authenticated.tsx                 -> src/pages/AuthLayout.tsx        (wrapper com <Outlet/> + guard)
src/routes/_authenticated/admin/index.tsx     -> src/pages/admin/Dashboard.tsx   (/admin)
src/routes/_authenticated/admin/sorteios.tsx  -> src/pages/admin/Sorteios.tsx
src/routes/_authenticated/admin/cartoes.tsx   -> src/pages/admin/Cartoes.tsx
src/routes/_authenticated/admin/configuracoes.tsx -> src/pages/admin/Configuracoes.tsx
```

- Substituir `createFileRoute`, `Link` e `useNavigate` do TanStack pelos equivalentes do `react-router-dom`.
- Substituir `head()` por `react-helmet-async` (ou `<title>` direto + meta tags) para SEO por página.
- Guard de autenticação: componente `<RequireAuth>` que envolve `/admin/*` (substitui `_authenticated.tsx` + `auth-middleware`).

### 3. Build e deploy
- **`vite.config.ts`**: remover `tanstackStart()`, manter `viteReact()`, `tailwindcss()`, `viteTsConfigPaths()`.
- **`package.json`**: scripts simples `vite` / `vite build` / `vite preview`. Remover deps `@tanstack/react-start`, `wrangler`, `@cloudflare/*`.
- **Remover arquivos**: `app.config.ts`, `wrangler.toml`, `wrangler.jsonc`, `src/server.ts`, `src/lib/error-capture.ts`, `src/lib/error-page.ts`.
- **`vercel.json`**: já existe com rewrite `/(.*) -> /index.html` (perfeito para SPA). Manter.

### 4. Backend / Supabase
- **Sem mudanças** no schema, RLS, hooks (`useActiveDraw`, etc.) ou no client `src/integrations/supabase/client.ts` — tudo já roda 100% no browser.
- Remover `client.server.ts` e `auth-middleware.ts` (não fazem sentido em SPA puro).
- Toda lógica que estava em server functions (se houver) passa a ser chamada direta do client via `supabase-js` (já é o caso hoje).

### 5. SEO
- SPA tem SEO mais limitado que SSR, mas para um app de conferência ao vivo (área logada + página pública dinâmica) o impacto é mínimo.
- Manter `<title>` e meta tags via `react-helmet-async` por página.

## Resultado
- `bun run build` gera `dist/` estático.
- Deploy na Vercel detecta Vite automaticamente; `vercel.json` já cobre o fallback de SPA para refresh em rotas profundas.
- Zero configuração de servidor, edge functions ou workers.

## Ordem de execução
1. Instalar `react-router-dom` e `react-helmet-async`; remover deps TanStack Start + Cloudflare.
2. Criar `index.html`, `src/main.tsx`, `src/App.tsx` com as rotas.
3. Migrar cada página de `src/routes/` para `src/pages/` ajustando imports.
4. Atualizar `vite.config.ts` e `package.json`.
5. Apagar arquivos obsoletos (`server.ts`, `app.config.ts`, `wrangler.*`, `routeTree.gen.ts`, `__root.tsx`, `start.ts`, `router.tsx`).
6. Validar build local e navegação.
