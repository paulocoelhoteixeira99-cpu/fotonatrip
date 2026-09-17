-- Migration 007: Checkout schema (event pricing, MP OAuth, order policies)

-- 1. Add event-level pricing
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_per_photo_cents INT NOT NULL DEFAULT 1500;

-- 2. Add MP OAuth fields to photographers
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT;
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS mp_user_id TEXT;

-- 3. Add download tracking to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ;

-- 4. Allow clients to create orders
CREATE POLICY "Clients can create orders"
  ON orders FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- 5. Allow clients to insert order items
CREATE POLICY "Clients can create order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.client_id = auth.uid()
    )
  );

-- 6. Function to sync event price to all its photos
CREATE OR REPLACE FUNCTION sync_event_photo_prices()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE photos SET price_cents = NEW.price_per_photo_cents
  WHERE event_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_event_prices
  AFTER UPDATE OF price_per_photo_cents ON events
  FOR EACH ROW
  WHEN (OLD.price_per_photo_cents IS DISTINCT FROM NEW.price_per_photo_cents)
  EXECUTE FUNCTION sync_event_photo_prices();

-- 7. Sync price on photo insert (new photos get event price)
CREATE OR REPLACE FUNCTION set_photo_price_from_event()
RETURNS TRIGGER AS $$
BEGIN
  SELECT price_per_photo_cents INTO NEW.price_cents
  FROM events WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_photo_price
  BEFORE INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION set_photo_price_from_event();
