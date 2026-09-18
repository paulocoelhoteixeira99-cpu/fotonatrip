-- Migration 008: Allow clients to read their own orders and download photos

-- 1. Clients can read their own orders
CREATE POLICY "Clients can read own orders"
  ON orders FOR SELECT
  USING (client_id = auth.uid());

-- 2. Clients can read items of their own orders
CREATE POLICY "Clients can read own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.client_id = auth.uid()
    )
  );

-- 3. Clients can update downloaded_at on their own order items
CREATE POLICY "Clients can track downloads"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.client_id = auth.uid()
    )
  );
