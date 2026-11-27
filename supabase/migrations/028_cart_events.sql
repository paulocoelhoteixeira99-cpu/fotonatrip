-- Log de eventos do carrinho para analytics
CREATE TABLE IF NOT EXISTS cart_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  photo_id uuid REFERENCES photos(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('add', 'remove', 'add_package', 'clear')),
  price_cents int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX cart_events_created_at_idx ON cart_events (created_at DESC);
CREATE INDEX cart_events_event_id_idx ON cart_events (event_id);
CREATE INDEX cart_events_session_id_idx ON cart_events (session_id);

ALTER TABLE cart_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cart events"
  ON cart_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role reads cart events"
  ON cart_events FOR SELECT
  USING (auth.role() = 'service_role');
