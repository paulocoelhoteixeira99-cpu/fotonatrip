@AGENTS.md

# fotonatrip.com

Plataforma onde fotografos fazem upload de fotos de eventos/viagens e clientes encontram suas fotos usando reconhecimento facial (busca por selfie).

## Stack

- **Frontend**: Next.js 16 + App Router + TypeScript + Tailwind CSS v4 + Framer Motion
- **Database/Auth**: Supabase (PostgreSQL + pgvector + Auth)
- **Photo Storage**: DigitalOcean Spaces (S3-compatible) + CDN
- **Photo Processing**: FastAPI + InsightFace (buffalo_l, 512d, CPU) em DO Droplet
- **Facial Recognition**: InsightFace server-side (512d embeddings, cosine similarity, threshold 0.4)
- **Watermarks**: Server-side (Pillow, 1200px max, blur 0.85px, JPEG 60%, texto 40%/35% opacidade, linhas 45%)
- **Payments**: Mercado Pago (Payment Brick card + custom Pix + Split Payment marketplace)
- **Icons**: Lucide React

## Infraestrutura

| Servico | Detalhes |
|---------|----------|
| **Vercel** | https://www.fotonatrip.com.br (auto-deploy on push to master) |
| **DO Droplet** | 2 vCPU / 4GB RAM / Ubuntu 24.04 / NYC1 / IP: 157.245.86.67 |
| **DO Spaces** | Bucket `fotonatrip-storage`, CDN: `fotonatrip-storage.nyc3.cdn.digitaloceanspaces.com` |
| **Supabase** | Project ID: uakfyqxsnhbvxpaedhqr (Sao Paulo) |
| **GitHub** | paulocoelhoteixeira99-cpu/fotonatrip (branch: master) |
| **API** | https://api.fotonatrip.com.br (FastAPI + uvicorn 2 workers, systemd `fotonatrip`) |

**IMPORTANTE**: Vercel redireciona `fotonatrip.com.br` -> `www.fotonatrip.com.br` (308). Todas URLs de webhook/callback DEVEM usar prefixo `www`.

## Estrutura do Projeto

```
src/
  app/
    page.tsx                    # Landing page (server component)
    layout.tsx                  # Root layout (Geist fonts, CartProvider, CartBar)
    globals.css                 # Tailwind v4 theme (dark, green accent #0d9668)
    login/                      # Email/senha + Google OAuth
    cadastro/                   # Registro com selecao de role + LGPD consent
    esqueci-senha/              # Solicitar reset de senha
    redefinir-senha/            # Redefinir senha (link do email)
    auth/callback/              # OAuth callback (cria profile, trata role)
    buscar/                     # Busca facial 3 etapas (evento > selfie > resultados)
    eventos/                    # Lista publica de eventos (paginado, filtros)
    eventos/[id]/               # Galeria publica do evento (tabs: Todas / Sem rosto)
    carrinho/                   # Carrinho de compras (agrupa por evento)
    checkout/                   # Pagamento (MP Payment Brick, dynamic import ssr:false)
    checkout/sucesso/           # Pos-pagamento com polling de status
    checkout/falha/             # Pagamento falhou (carrinho preservado)
    minhas-compras/             # Historico + download de fotos compradas
    dashboard/
      layout.tsx                # Sidebar nav (Inicio, Eventos, Vendas, Configuracoes)
      page.tsx                  # Overview do fotografo (stats + eventos recentes)
      eventos/                  # Lista de eventos do fotografo
      eventos/novo/             # Criar novo evento (com preco, pacote, agendamento)
      eventos/[id]/             # Gerenciar evento (upload, delete, reprocess, QR code)
      upload/                   # Upload em lote (alternativo)
      vendas/                   # Relatorio de vendas (grafico 30 dias, tabela)
      configuracoes/            # Perfil + conexao Mercado Pago OAuth
    admin/                      # Dashboard admin (stats da plataforma, filtros por periodo)
    termos/                     # Termos de uso (server component, estatico)
    privacidade/                # Politica de privacidade LGPD (server component)
    ajuda/                      # FAQ / Central de ajuda (server component)
    api/
      checkout/                 # POST: criar order + MP Preference
      process-payment/          # POST: processar pagamento (card/Pix)
      check-payment/            # GET: verificar status do pagamento
      download/                 # GET: download foto original (sem watermark)
      webhook/mercadopago/      # POST: webhook MP (validacao HMAC-SHA256)
      mp/connect/               # GET: iniciar OAuth MP
      mp/callback/              # GET: callback OAuth MP (salvar tokens)
      mp/disconnect/            # POST: desconectar MP
      admin/stats/              # GET: metricas admin (role check)
  lib/
    supabase/client.ts          # Browser Supabase client (createBrowserClient)
    supabase/server.ts          # Server Supabase client (createServerClient + cookies)
    face-recognition.ts         # API calls ao servidor FastAPI (processPhoto, getEmbeddingFromFile)
    photos.ts                   # getPhotoUrl (CDN), deletePhotoFiles (DO server)
    cart.tsx                    # CartProvider context (localStorage, package vs individual logic)
  components/
    Header.tsx                  # Header fixo com menu desktop/mobile, auth, cart badge
    Hero.tsx                    # Hero section da landing page
    HowItWorks.tsx              # 4 etapas do processo
    Features.tsx                # 4 features da plataforma
    ForPhotographers.tsx        # Secao para fotografos (6 beneficios)
    CTA.tsx                     # Call-to-action
    Footer.tsx                  # Footer com links e contato
    CartBar.tsx                 # Barra flutuante mobile do carrinho
    CheckoutContent.tsx         # Formulario de pagamento (card + Pix + calculo de taxas)
    CopyEmailButton.tsx         # Botao copiar email (desktop) / mailto (mobile)
  middleware.ts                 # Protege /dashboard e /admin, exclui webhooks
supabase/
  migrations/                   # 15 migrations SQL (001-015)
```

## Banco de Dados (Supabase PostgreSQL + pgvector)

### Tabelas

| Tabela | Descricao |
|--------|-----------|
| `profiles` | Extensao de auth.users (full_name, role: client/photographer/admin) |
| `photographers` | Dados extras do fotografo (business_name, phone, city, state, mp_*) |
| `events` | Eventos com status (active/inactive/scheduled), preco, pacote |
| `photos` | Fotos com paths (storage, watermark), status (processing/ready/failed), preco em centavos |
| `face_embeddings` | Embeddings 512d (vector) com bounding box por face detectada |
| `orders` | Pedidos (client_id, status, total_cents, platform_fee_cents, payment_id, photographer_id) |
| `order_items` | Itens do pedido (photo_id, photographer_id, price_cents, downloaded_at) |

### Funcoes e Triggers

- `handle_new_user()` — trigger on auth.users INSERT: cria profile + photographer se role=photographer
- `update_event_photo_count()` — trigger on photos INSERT/DELETE: atualiza events.photo_count
- `sync_event_photo_prices()` — trigger on events UPDATE price: sincroniza para todas as fotos
- `set_photo_price_from_event()` — trigger BEFORE INSERT on photos: herda preco do evento
- `search_faces_by_embedding()` — RPC: busca facial por similaridade coseno (512d, threshold 0.4)
- `activate_scheduled_events()` — RPC: ativa eventos agendados cuja data ja passou
- `photographer_has_order_items()` — SECURITY DEFINER: verifica se fotografo tem itens no pedido

### RLS (Row Level Security)

- Todas as tabelas tem RLS ativado
- profiles, photographers, events, photos, face_embeddings: SELECT publico
- orders/order_items: SELECT restrito a client_id ou photographer_id
- Photographers gerenciam seus proprios recursos (events, photos)
- Clients criam orders e order_items (INSERT com check de auth.uid)

## Regras de Negocio

### Precos e Comissao
- Preco por foto definido por evento pelo fotografo (padrao R$15)
- Pacote opcional (todas as fotos reconhecidas por preco fixo)
- Comissao da plataforma: **7%** | Repasse ao fotografo: **93%**
- Precos SEMPRE em centavos no banco/codigo (ex: 1500 = R$15,00)
- `formatPrice(cents)` para exibicao: 1500 -> "R$ 15,00"

### Reconhecimento Facial
- InsightFace buffalo_l, embeddings 512 dimensoes
- Index HNSW (vector_cosine_ops) para busca rapida
- Threshold de similaridade: 0.4 (cosine)
- Similaridade normalizada para exibicao: 0.4-0.8 mapeado para 70-100%
- Maximo 50 resultados por busca

### Carrinho
- Persistido em localStorage (chave: `fotonatrip_cart`)
- Flag `hydrated` previne mismatch SSR
- Logica pacote vs individual: pacote remove individuais do mesmo evento
- Login so e exigido no checkout, nao para adicionar ao carrinho

### Pagamento (Mercado Pago)
- Checkout cria order (pending) + MP Preference
- **Cartao**: Payment Brick, taxa processamento 4.99%
- **Pix**: QR code gerado, polling /api/check-payment a cada 3s, taxa 0.99%
- `calcAdjusted()` arredonda para CIMA para cobrir taxa
- Webhook MP valida assinatura HMAC-SHA256 (MP_WEBHOOK_SECRET)
- Webhook nao faz downgrade de status (paid nunca volta para pending)
- Webhook sempre retorna 200 (mesmo com erro, para parar retries do MP)
- Download via `/api/download` verifica `orders.client_id` + status=paid
- Marketplace: se fotografo tem MP conectado via OAuth, split payment automatico

### Mercado Pago OAuth (Marketplace)
- `/api/mp/connect` -> redireciona para auth.mercadopago.com.br
- `/api/mp/callback` -> troca code por access_token, salva em photographers
- `/api/mp/disconnect` -> limpa tokens do fotografo
- TODO: Travar criacao de evento sem conta MP conectada

### Upload de Fotos
- 3 uploads concorrentes + botao cancelar (AbortController)
- Resize client-side antes do upload (max 2400px, JPEG 0.85)
- Servidor processa: watermark + embeddings via `/process-photo`
- Watermark: resize 1200px max, blur 0.85px, JPEG 60%, texto "FOTONATRIP" rotacionado 30° (opacidade 40%/35%), linhas diagonais cruzadas (opacidade 45%)
- Deteccao de duplicatas por original_filename
- Fotos/eventos deletados tambem removem arquivos do DO Spaces via /delete-files
- "Reprocessar rostos" usa `/extract-embedding` — so atualiza embeddings, NAO regenera watermarks

### Autenticacao e Roles
- Roles: `client`, `photographer`, `admin`
- Middleware protege /dashboard (photographer/admin) e /admin (admin)
- Google OAuth com cookie `oauth_role` para definir role no signup
- Cadastro exige consentimento LGPD (termos + reconhecimento facial)

### Eventos
- Status: `active` (visivel), `inactive` (oculto), `scheduled` (ativa automaticamente)
- Agendamento: `scheduled_at` + RPC `activate_scheduled_events()` chamado nas paginas publicas
- Campo `is_active` legado (migrado para `status` na migration 011)
- Cidades carregadas via API do IBGE por estado selecionado

### Retencao de Dados
- Cron no DO Droplet a cada 6 horas para limpeza de dados antigos

## Variaveis de Ambiente

### Publicas (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Chave publica Supabase
- `NEXT_PUBLIC_API_URL` — https://api.fotonatrip.com.br
- `NEXT_PUBLIC_API_KEY` — Chave de autenticacao da API FastAPI
- `NEXT_PUBLIC_CDN_URL` — https://fotonatrip-storage.nyc3.cdn.digitaloceanspaces.com
- `NEXT_PUBLIC_APP_URL` — https://www.fotonatrip.com.br (DEVE ter www)
- `NEXT_PUBLIC_MP_PUBLIC_KEY` — Chave publica Mercado Pago

### Sensiveis (apenas Vercel, nunca no client)
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_CLIENT_ID`
- `MERCADOPAGO_CLIENT_SECRET`
- `MP_WEBHOOK_SECRET`

## Convencoes de Codigo

### Geral
- Idioma do app: Portugues (BR), sem acentos no codigo
- Dark theme com verde accent (#0d9668 primary)
- Tailwind v4 (config via CSS @theme, nao tailwind.config)
- CSS utilitarios customizados: `.glass`, `.gradient-text`, `.glow-green`
- Framer Motion para animacoes de entrada e transicoes
- Lucide React para todos os icones
- Path alias: `@/*` -> `./src/*`

### Componentes
- "use client" para paginas interativas (forms, dashboard, busca)
- Server components para paginas estaticas (termos, privacidade, ajuda)
- `dynamic()` com `ssr: false` para componentes que dependem do browser (MP Brick)
- Suspense wrapper para paginas com useSearchParams

### Paginas Pareadas (manter sincronizadas)
- **`/buscar` e `/eventos/[id]`**: compartilham padroes de grid de fotos (card com preco/botao visivel abaixo da imagem) e lightbox (flex-col, 100dvh, object-contain). Ao alterar layout de cards, lightbox ou interacao com carrinho em uma, DEVE aplicar a mesma mudanca na outra.

### Estilo de Inputs
- Classes padrao: `bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary`
- Dark scheme para date/select: `[color-scheme:dark]`
- Botao primario: `bg-primary hover:bg-primary-dark text-white rounded-xl`
- Glass cards: classe `.glass` + `rounded-2xl p-5/p-6`

## Seguranca do Servidor (DO Droplet)

- UFW firewall: apenas portas 22, 80, 443
- fail2ban: protecao contra brute force SSH
- SSH: login root apenas via chave (senha desabilitada)
- nginx: rate limiting 10 req/s por IP (burst 20)
- nginx: apenas rotas validas da API, resto retorna 444
- nginx: acesso direto por IP bloqueado (apenas dominio)
- nginx: security headers + server_tokens off
- FastAPI: CORS restrito a fotonatrip.com.br + vercel.app
- FastAPI: docs/redoc/openapi desabilitados
- `/delete-files`: protecao contra path traversal (bloqueia `..` e paths absolutos)

---

# Regras de Desenvolvimento

## Politica de Deploy

**NUNCA fazer push/deploy sem testar antes**, a menos que o usuario peca explicitamente para subir direto.

### Checklist Pre-Deploy (OBRIGATORIO)

1. **Build local**: Rodar `npm run build` e verificar que compila sem erros
2. **Lint**: Rodar `npm run lint` e corrigir warnings/errors
3. **Testar manualmente** as paginas/fluxos afetados pela mudanca
4. **Verificar**: Nenhum `console.log` de debug esquecido no codigo
5. **Verificar**: Nenhuma chave/secret exposta no client-side
6. **Verificar**: Nenhum import nao utilizado
7. **Verificar**: Tipagem TypeScript correta (sem `any` desnecessario)
8. **Verificar**: Middleware nao bloqueia rotas que precisam ser publicas

### Antes de Commitar

- Revisar todas as mudancas com `git diff`
- Commit com mensagem descritiva seguindo o padrao: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- NAO fazer push automatico — perguntar ao usuario primeiro

## Code Review

Antes de considerar qualquer mudanca como pronta:

### Seguranca
- [ ] Sem SQL injection (usar parametrized queries / Supabase SDK)
- [ ] Sem XSS (nao usar dangerouslySetInnerHTML sem sanitizar)
- [ ] API routes validam autenticacao onde necessario
- [ ] Dados sensiveis nao expostos no client (service_role_key, access_tokens)
- [ ] RLS policies cobrem o acesso necessario
- [ ] Webhook valida assinatura antes de processar

### Qualidade
- [ ] Sem logica duplicada (reusar funcoes existentes em lib/)
- [ ] Tratamento de erro adequado (try/catch, estados de loading/error)
- [ ] Responsivo (testar mobile e desktop)
- [ ] Acessibilidade basica (labels em forms, alt em imagens)
- [ ] Performance (evitar re-renders desnecessarios, lazy loading onde apropriado)

### Consistencia
- [ ] Segue o padrao visual existente (glass, cores, espacamento)
- [ ] Usa componentes/utils ja existentes (formatPrice, getPhotoUrl, etc.)
- [ ] Precos sempre em centavos no banco e logica, formatPrice() para exibicao
- [ ] Mensagens de erro em portugues

## Testes

O projeto atualmente NAO possui testes automatizados. Para novas features e correcoes:

### Testes Manuais Obrigatorios
- Testar o fluxo completo afetado pela mudanca
- Testar em mobile e desktop
- Testar estados: loading, erro, vazio, sucesso
- Testar com usuario logado e deslogado (onde aplicavel)
- Testar roles diferentes (client, photographer, admin)

### Testes Automatizados (implementar gradualmente)
- Priorizar testes para API routes (checkout, payment, webhook, download)
- Testes unitarios para funcoes de lib/ (cart logic, formatPrice, URL builders)
- Validar que webhook rejeita assinaturas invalidas
- Validar que download so funciona com order paga

## Manutencao do Contexto

**Apos QUALQUER mudanca significativa no projeto, DEVO atualizar este CLAUDE.md e/ou o arquivo de memoria.**

Mudancas significativas incluem:
- Nova pagina/rota adicionada
- Nova tabela ou coluna no banco (nova migration)
- Nova API route
- Mudanca em regra de negocio (precos, comissoes, fluxos)
- Novo componente reutilizavel
- Mudanca em infraestrutura
- Nova dependencia adicionada
- Correcao de bug importante (adicionar em Licoes Aprendidas)

## Licoes Aprendidas

- InsightFace cosine similarity (0.4-0.8) e mais baixo que face-api.js — normalizar para display
- HTTPS site nao pode chamar HTTP server — precisa SSL/subdominio
- Upload paralelo (3 concurrent) + 2 workers = ~2.8s/foto vs ~4.1s sequencial
- Bot scanners atacam servidores expostos — bloquear com nginx whitelist + 444
- Vercel 308: `fotonatrip.com.br` -> `www.fotonatrip.com.br` — URLs externas devem usar www
- MP webhook retornava 502: supabase client fora do try/catch + tipo paymentId errado
- Download API tinha nome de coluna errado (user_id vs client_id) — causava 403
- MP Payment Brick `onReady` limpa erros — so limpar no primeiro ready
- Mobile download: blob URL + a.click() nao funciona — usar URL direta com Content-Disposition
- MP anti-fraud rejeita cards sem `items.description` na Preference
- MP card rejection "high_risk" comum em integracoes novas — melhora com historico
- Comprar da propria conta (payer=seller) aciona anti-fraud do MP
- Circular RLS entre orders/order_items causa 500 — usar SECURITY DEFINER function
- Lightbox mobile cortando fotos: causa real era overflow horizontal na pagina (tabs excedendo viewport) que alterava o zoom do browser — fix com `overflow-x-hidden` no wrapper
- /buscar e /eventos/[id] compartilham UX de grid e lightbox — sempre sincronizar mudancas entre as duas

## TODO

- [ ] Travar criacao de evento sem conta MP conectada
- [ ] Limpar bucket antigo do Supabase Storage (618 files, 936MB, nao referenciado)
- [ ] Implementar testes automatizados para API routes
- [ ] Google SSO login (adiado)

## Contato

- Email: fotonatrip2026@gmail.com
- Instagram: @fotonatrip_oficial
