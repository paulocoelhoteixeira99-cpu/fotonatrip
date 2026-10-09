-- Migration 019: Allow event owner to delete photos from collaborators
CREATE POLICY "Event owner can delete photos in own events"
  ON public.photos FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = photos.event_id
      AND events.photographer_id = auth.uid()
    )
  );
