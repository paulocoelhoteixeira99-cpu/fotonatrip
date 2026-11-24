-- Add event_id to admin_recent_orders RPC (link to event page)
DROP FUNCTION IF EXISTS admin_recent_orders(timestamptz, timestamptz, int);
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
  event_id uuid,
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
    sub.event_id,
    o.created_at
  FROM orders o
  LEFT JOIN photographers ph ON ph.id = o.photographer_id
  LEFT JOIN profiles pr ON pr.id = o.photographer_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS photo_count,
      MIN(e.title) AS event_name,
      MIN(e.id::text)::uuid AS event_id
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
