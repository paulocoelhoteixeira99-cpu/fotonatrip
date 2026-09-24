-- Migration 013: Allow photographers to read orders that contain their sold items
-- Uses SECURITY DEFINER function to avoid circular RLS reference between
-- orders and order_items tables (which would cause 500 errors)

CREATE OR REPLACE FUNCTION public.photographer_has_order_items(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_items.order_id = p_order_id
    AND order_items.photographer_id = auth.uid()
  );
$$;

CREATE POLICY "Photographers can view orders with their items"
  ON public.orders FOR SELECT
  USING (public.photographer_has_order_items(id));
