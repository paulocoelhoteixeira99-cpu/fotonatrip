# Admin Stats — RPCs SQL propostas

Substituir queries que buscam TODAS as rows e agregam em JS por RPCs que agregam direto no PostgreSQL.
Cada RPC retorna poucas rows (agregadas), eliminando o problema do limite de 1000 rows do Supabase.

---

## RPC 1: `admin_overview_totals`

**Usado em**: Overview → cards financeiros + ticket medio
**Hoje**: busca TODOS os orders pagos, soma em JS
**Proposta**: uma query que retorna 1 row com os totais

```sql
CREATE OR REPLACE FUNCTION admin_overview_totals(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  revenue_cents bigint,
  platform_fee_cents bigint,
  orders_count bigint,
  avg_ticket_cents bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(total_cents), 0) AS revenue_cents,
    COALESCE(SUM(platform_fee_cents), 0) AS platform_fee_cents,
    COUNT(*) AS orders_count,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(SUM(total_cents)::numeric / COUNT(*))
      ELSE 0
    END AS avg_ticket_cents
  FROM orders
  WHERE status = 'paid'
    AND (p_from IS NULL OR created_at >= p_from)
    AND (p_to IS NULL OR created_at <= p_to);
$$;
```

**Retorna**: 1 row (4 colunas)

---

## RPC 2: `admin_photographer_breakdown`

**Usado em**: Overview → tabela "Vendas por fotografo"
**Hoje**: busca TODOS os order_items (paginado), agrupa em JS por photographer_id
**Proposta**: agrega direto no SQL com JOIN em photographers/profiles para o nome

```sql
CREATE OR REPLACE FUNCTION admin_photographer_breakdown(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  photographer_id uuid,
  name text,
  revenue_cents bigint,
  platform_fee_cents bigint,
  payout_cents bigint,
  items_sold bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    oi.photographer_id,
    COALESCE(ph.business_name, pr.full_name, 'Sem nome') AS name,
    SUM(oi.price_cents) AS revenue_cents,
    ROUND(SUM(oi.price_cents) * 0.07) AS platform_fee_cents,
    ROUND(SUM(oi.price_cents) * 0.93) AS payout_cents,
    COUNT(*) AS items_sold
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN photographers ph ON ph.id = oi.photographer_id
  LEFT JOIN profiles pr ON pr.id = oi.photographer_id
  WHERE o.status = 'paid'
    AND oi.photographer_id IS NOT NULL
    AND (p_from IS NULL OR o.created_at >= p_from)
    AND (p_to IS NULL OR o.created_at <= p_to)
  GROUP BY oi.photographer_id, ph.business_name, pr.full_name
  ORDER BY revenue_cents DESC;
$$;
```

**Retorna**: ~N rows (1 por fotografo com vendas)

---

## RPC 3: `admin_recent_orders`

**Usado em**: Overview → tabela "Pedidos recentes"
**Hoje**: busca TODOS os orders, pega top 20, depois busca items para contar fotos e pegar evento
**Proposta**: uma query que ja traz tudo junto (top 20 orders com photo_count e event_name)

```sql
CREATE OR REPLACE FUNCTION admin_recent_orders(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  client_email text,
  total_cents int,
  platform_fee_cents int,
  photographer_name text,
  coupon_code text,
  discount_cents int,
  photo_count bigint,
  event_name text,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    o.id,
    o.client_email,
    o.total_cents,
    COALESCE(o.platform_fee_cents, 0) AS platform_fee_cents,
    CASE
      WHEN o.photographer_id IS NULL THEN 'Compartilhado'
      ELSE COALESCE(ph.business_name, pr.full_name, 'Sem nome')
    END AS photographer_name,
    o.coupon_code,
    COALESCE(o.discount_cents, 0) AS discount_cents,
    COALESCE(sub.photo_count, 0) AS photo_count,
    sub.event_name,
    o.created_at
  FROM orders o
  LEFT JOIN photographers ph ON ph.id = o.photographer_id
  LEFT JOIN profiles pr ON pr.id = o.photographer_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS photo_count,
      MIN(e.title) AS event_name  -- pega o primeiro evento do pedido
    FROM order_items oi
    JOIN photos p ON p.id = oi.photo_id
    JOIN events e ON e.id = p.event_id
    WHERE oi.order_id = o.id
  ) sub ON true
  WHERE o.status = 'paid'
    AND (p_from IS NULL OR o.created_at >= p_from)
    AND (p_to IS NULL OR o.created_at <= p_to)
  ORDER BY o.created_at DESC
  LIMIT p_limit;
$$;
```

**Retorna**: 20 rows (com photo_count e event_name ja inclusos)

---

## RPC 4: `admin_sales_by_event`

**Usado em**: Vendas por Evento → tabela completa
**Hoje**: busca TODOS os events + TODOS os order_items (paginado), agrupa em JS
**Proposta**: uma query que ja retorna tudo agregado

```sql
CREATE OR REPLACE FUNCTION admin_sales_by_event(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  event_id uuid,
  title text,
  photographer text,
  photo_count int,
  price_cents int,
  status text,
  items_sold bigint,
  orders_count bigint,
  revenue_cents bigint,
  platform_fee_cents bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    ev.id AS event_id,
    ev.title,
    COALESCE(ph.business_name, pr.full_name, 'Sem nome') AS photographer,
    COALESCE(ev.photo_count, 0) AS photo_count,
    COALESCE(ev.price_per_photo_cents, 0) AS price_cents,
    ev.status,
    COALESCE(sales.items_sold, 0) AS items_sold,
    COALESCE(sales.orders_count, 0) AS orders_count,
    COALESCE(sales.revenue_cents, 0) AS revenue_cents,
    ROUND(COALESCE(sales.revenue_cents, 0) * 0.07) AS platform_fee_cents
  FROM events ev
  LEFT JOIN photographers ph ON ph.id = ev.photographer_id
  LEFT JOIN profiles pr ON pr.id = ev.photographer_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS items_sold,
      COUNT(DISTINCT oi.order_id) AS orders_count,
      SUM(oi.price_cents) AS revenue_cents
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN photos p ON p.id = oi.photo_id
    WHERE o.status = 'paid'
      AND p.event_id = ev.id
      AND (p_from IS NULL OR o.created_at >= p_from)
      AND (p_to IS NULL OR o.created_at <= p_to)
  ) sales ON true
  ORDER BY COALESCE(sales.revenue_cents, 0) DESC;
$$;
```

**Retorna**: ~N rows (1 por evento, ja com vendas agregadas)

---

## RPC 5: `admin_orders_by_event`

**Usado em**: Trafego → tabela "Conversao por evento" (conta pedidos por evento)
**Hoje**: busca TODOS os order_items (paginado), agrupa por event_id em JS
**Proposta**: agrega direto

```sql
CREATE OR REPLACE FUNCTION admin_orders_by_event()
RETURNS TABLE(
  event_id uuid,
  orders_count bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.event_id,
    COUNT(DISTINCT oi.order_id) AS orders_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN photos p ON p.id = oi.photo_id
  WHERE o.status = 'paid'
    AND p.event_id IS NOT NULL
  GROUP BY p.event_id;
$$;
```

**Retorna**: ~N rows (1 por evento que tem vendas)

---

## RPC 6: `admin_monthly_revenue`

**Usado em**: Crescimento → grafico "Receita por mes"
**Hoje**: busca todos os orders dos ultimos 6 meses, agrupa por mes em JS
**Proposta**: agrega direto

```sql
CREATE OR REPLACE FUNCTION admin_monthly_revenue(p_months int DEFAULT 6)
RETURNS TABLE(
  month text,
  revenue_cents bigint,
  platform_fee_cents bigint,
  orders_count bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM-DD') AS month,
    SUM(o.total_cents) AS revenue_cents,
    SUM(COALESCE(o.platform_fee_cents, 0)) AS platform_fee_cents,
    COUNT(*) AS orders_count
  FROM orders o
  WHERE o.status = 'paid'
    AND o.created_at >= DATE_TRUNC('month', NOW()) - (p_months - 1 || ' months')::interval
  GROUP BY DATE_TRUNC('month', o.created_at)
  ORDER BY DATE_TRUNC('month', o.created_at);
$$;
```

**Retorna**: ate 6 rows (1 por mes)

---

## Queries que NAO precisam de RPC

| Query | Motivo |
|-------|--------|
| `profiles` (crescimento) | Atualmente <1000 users, e o crescimento diario precisa de cada row individual pra contar por dia. Poderia virar RPC futuramente mas nao e urgente. |
| `events` lista (vendas por evento) | Coberto pelo RPC 4 que ja traz tudo. |
| `photographers` nomes | Sempre <1000 fotografos, nao precisa. |
| `page_views` (trafego) | Ja tem `.limit(10000)` e precisa de processamento complexo de user-agent no JS. Poderia virar RPC futuramente. |
| `order_items` para recent orders | Coberto pelo RPC 3 que ja traz photo_count e event_name. |
| Counts (events, photos, users) | Ja usam `{ count: "exact", head: true }`, eficiente. |

---

## Resumo de impacto

| Antes | Depois |
|-------|--------|
| Overview faz ~8 queries + pagina order_items | Overview faz 3 RPCs + 5 counts |
| Vendas por Evento faz 3 queries + pagina 1000+ items | 1 unica RPC |
| Trafego pagina 1000+ order_items | 1 RPC leve |
| Crescimento busca todos os orders | 1 RPC (6 rows) |
| Total de rows transferidas: milhares | Total: dezenas |

---

## Proximos passos

1. Revisar e aprovar as RPCs acima
2. Criar migration `023_admin_stats_rpcs.sql` com todas as funcoes
3. Rodar migration no Supabase
4. Atualizar `route.ts` para usar `supabase.rpc(...)` em vez das queries atuais
5. Remover `fetchAllPages` helper (nao sera mais necessario)
