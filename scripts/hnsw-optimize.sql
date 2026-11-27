-- Recriar indice HNSW com parametros otimizados para melhor recall
-- Rodar no Supabase SQL Editor (de madrugada, quando nao tem usuarios)
-- Tempo estimado: 1-5 minutos para ~57k embeddings

SET statement_timeout = '0';

DROP INDEX IF EXISTS face_embeddings_embedding_idx;

CREATE INDEX face_embeddings_embedding_idx ON face_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 200);

-- Verificar se criou:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'face_embeddings';
