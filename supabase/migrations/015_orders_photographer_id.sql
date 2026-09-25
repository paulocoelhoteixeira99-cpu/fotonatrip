-- Add photographer_id to orders table
ALTER TABLE orders ADD COLUMN photographer_id uuid REFERENCES photographers(id);

-- Populate existing orders from order_items (use the first photographer per order)
UPDATE orders o
SET photographer_id = sub.photographer_id
FROM (
  SELECT DISTINCT ON (order_id) order_id, photographer_id
  FROM order_items
  WHERE photographer_id IS NOT NULL
  ORDER BY order_id, created_at ASC
) sub
WHERE o.id = sub.order_id;
