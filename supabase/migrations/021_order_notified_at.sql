-- Add notified_at to orders for email dedup
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notified_at timestamptz;
