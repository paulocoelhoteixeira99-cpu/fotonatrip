-- Migration 018: Eventos Compartilhados (Multi-Fotografo)

-- 1. Novas colunas em events
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS collaborator_commission_pct INT NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS invite_code UUID DEFAULT gen_random_uuid();

-- 2. Novas colunas em photographers (chave Pix)
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random'));

-- 3. Tabela event_collaborators
CREATE TABLE IF NOT EXISTS event_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  photographer_id UUID REFERENCES photographers(id) ON DELETE CASCADE NOT NULL,
  commission_pct_snapshot INT NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, photographer_id)
);

ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;

-- Dono do evento pode ver colaboradores do seu evento
CREATE POLICY "event_owner_can_view_collaborators" ON event_collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_collaborators.event_id
      AND events.photographer_id = auth.uid()
    )
  );

-- Dono pode deletar (remover colaborador)
CREATE POLICY "event_owner_can_delete_collaborators" ON event_collaborators
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_collaborators.event_id
      AND events.photographer_id = auth.uid()
    )
  );

-- Colaborador pode ver seus proprios registros
CREATE POLICY "collaborator_can_view_own" ON event_collaborators
  FOR SELECT USING (photographer_id = auth.uid());

-- Colaborador pode inserir (aceitar convite) — validacao de invite_code feita no app
CREATE POLICY "photographer_can_accept_invite" ON event_collaborators
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

-- 4. Tabela payouts (unificada: host_commission, collaborator_payout, host_own_photos)
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('host_commission', 'collaborator_payout', 'host_own_photos')),
  photographer_id UUID REFERENCES photographers(id) NOT NULL,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) NOT NULL,
  amount_cents INT NOT NULL,
  commission_pct INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  payout_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Apenas leitura publica para o proprio fotografo ver seus payouts
CREATE POLICY "photographer_can_view_own_payouts" ON payouts
  FOR SELECT USING (photographer_id = auth.uid());

-- 5. Tabela payout_batches (lotes de pagamento semanal)
CREATE TABLE IF NOT EXISTS payout_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID REFERENCES photographers(id) NOT NULL,
  total_cents INT NOT NULL,
  items_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;

-- Fotografo pode ver seus proprios batches
CREATE POLICY "photographer_can_view_own_batches" ON payout_batches
  FOR SELECT USING (photographer_id = auth.uid());

-- 6. Adicionar FK de payouts para payout_batches
ALTER TABLE payouts ADD CONSTRAINT payouts_batch_fk
  FOREIGN KEY (payout_batch_id) REFERENCES payout_batches(id);

-- 7. Index para busca de invite_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_invite_code ON events(invite_code) WHERE invite_code IS NOT NULL;

-- 8. Index para busca de payouts pendentes
CREATE INDEX IF NOT EXISTS idx_payouts_pending ON payouts(photographer_id, status) WHERE status = 'pending';
