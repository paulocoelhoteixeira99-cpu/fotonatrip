-- Migration 023: Admin Stats RPCs
-- Substitui queries que buscam milhares de rows por agregacoes SQL diretas

-- RPC 1: Totais financeiros do overview
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
    COALESCE(SUM(total_cents), 0)::bigint AS revenue_cents,
    COALESCE(SUM(platform_fee_cents), 0)::bigint AS platform_fee_cents,
    COUNT(*)::bigint AS orders_count,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(SUM(total_cents)::numeric / COUNT(*))::bigint
      ELSE 0::bigint
    END AS avg_ticket_cents
  FROM orders
  WHERE status = 'paid'
    AND (p_from IS NULL OR created_at >= p_from)
    AND (p_to IS NULL OR created_at <= p_to);
$$;

-- RPC 2: Breakdown de vendas por fotografo
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
    SUM(oi.price_cents)::bigint AS revenue_cents,
    ROUND(SUM(oi.price_cents) * 0.07)::bigint AS platform_fee_cents,
    ROUND(SUM(oi.price_cents) * 0.93)::bigint AS payout_cents,
    COUNT(*)::bigint AS items_sold
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

-- RPC 3: Pedidos recentes com photo_count e event_name
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
      MIN(e.title) AS event_name
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

-- RPC 4: Vendas agregadas por evento
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
    COALESCE(sales.items_sold, 0)::bigint AS items_sold,
    COALESCE(sales.orders_count, 0)::bigint AS orders_count,
    COALESCE(sales.revenue_cents, 0)::bigint AS revenue_cents,
    ROUND(COALESCE(sales.revenue_cents, 0) * 0.07)::bigint AS platform_fee_cents
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

-- RPC 5: Contagem de pedidos por evento (para conversao de trafego)
CREATE OR REPLACE FUNCTION admin_orders_by_event()
RETURNS TABLE(
  event_id uuid,
  orders_count bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.event_id,
    COUNT(DISTINCT oi.order_id)::bigint AS orders_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN photos p ON p.id = oi.photo_id
  WHERE o.status = 'paid'
    AND p.event_id IS NOT NULL
  GROUP BY p.event_id;
$$;

-- RPC 6: Receita mensal (ultimos N meses)
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
    SUM(o.total_cents)::bigint AS revenue_cents,
    SUM(COALESCE(o.platform_fee_cents, 0))::bigint AS platform_fee_cents,
    COUNT(*)::bigint AS orders_count
  FROM orders o
  WHERE o.status = 'paid'
    AND o.created_at >= DATE_TRUNC('month', NOW()) - ((p_months - 1) || ' months')::interval
  GROUP BY DATE_TRUNC('month', o.created_at)
  ORDER BY DATE_TRUNC('month', o.created_at);
$$;
