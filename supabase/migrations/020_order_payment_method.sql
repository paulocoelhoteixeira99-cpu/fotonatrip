-- Migration 020: Add payment method to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
