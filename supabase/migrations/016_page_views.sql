-- Page views tracking for analytics
CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  user_agent TEXT,
  referrer TEXT,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for admin queries
CREATE INDEX idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX idx_page_views_event_id ON page_views(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_page_views_session_id ON page_views(session_id);
CREATE INDEX idx_page_views_path ON page_views(path);

-- RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert page views (tracking from frontend)
CREATE POLICY "anon_insert_page_views" ON page_views
  FOR INSERT WITH CHECK (true);
