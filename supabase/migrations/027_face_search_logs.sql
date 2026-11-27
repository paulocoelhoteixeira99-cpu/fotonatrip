-- Log de buscas faciais para analytics
CREATE TABLE IF NOT EXISTS face_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  results_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index para queries por periodo e evento
CREATE INDEX face_search_logs_created_at_idx ON face_search_logs (created_at DESC);
CREATE INDEX face_search_logs_event_id_idx ON face_search_logs (event_id);

-- RLS: INSERT publico (qualquer visitante pode logar busca), SELECT restrito a admin via service role
ALTER TABLE face_search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search logs"
  ON face_search_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role reads search logs"
  ON face_search_logs FOR SELECT
  USING (auth.role() = 'service_role');
