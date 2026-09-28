<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes para Agentes

## Antes de Modificar Codigo

1. **Ler o CLAUDE.md** — contem stack, estrutura, regras de negocio e convencoes
2. **Ler os arquivos envolvidos** — nunca propor mudancas em codigo que nao leu
3. **Consultar docs do Next.js 16** em `node_modules/next/dist/docs/` se mexer em rotas, layouts ou middleware

## Padroes do Projeto

### Arquitetura
- App Router (Next.js 16) — sem pages/ directory
- "use client" para paginas interativas, server components para estaticas
- Supabase client: `@/lib/supabase/client` (browser) vs `@/lib/supabase/server` (API routes/server)
- Cart state via React Context + localStorage (nao banco)
- Pagamentos via Mercado Pago SDK (Payment Brick + custom Pix)

### Estilo
- Tailwind CSS v4 (tema definido em globals.css via @theme, NAO em tailwind.config)
- Dark theme obrigatorio (#0a0a0a background, #0d9668 primary green)
- Classes utilitarias: `.glass` (glassmorphism), `.gradient-text`, `.glow-green`
- Inputs: `bg-white/5 border border-border rounded-xl px-4 py-3 text-sm`
- Cards: `glass rounded-2xl p-5`
- Botao primario: `bg-primary hover:bg-primary-dark text-white rounded-xl`
- Icones: sempre Lucide React, nunca outros icon packs

### Convencoes de Dados
- Precos SEMPRE em centavos (int) — usar `formatPrice(cents)` para exibicao
- UUIDs para todas as PKs
- Datas em timestamptz (PostgreSQL) / ISO string (JS)
- Embeddings faciais: vector(512) — cosine similarity
- Paths de fotos: relativos ao bucket DO Spaces (nao URLs completas no banco)

### Seguranca (CRITICO)
- NUNCA expor service_role_key, access_tokens ou secrets no client
- API routes DEVEM validar auth onde necessario (supabase.auth.getUser())
- Webhook DEVE validar assinatura HMAC antes de processar
- RLS ativo em todas as tabelas — verificar policies ao criar/alterar tabelas
- Paths de arquivos: validar contra path traversal (../ e paths absolutos)

## Checklist ao Finalizar

- [ ] `npm run build` compila sem erros
- [ ] `npm run lint` sem warnings
- [ ] Sem console.log de debug
- [ ] Sem imports nao utilizados
- [ ] Sem secrets no client-side
- [ ] CLAUDE.md atualizado se houve mudanca significativa
