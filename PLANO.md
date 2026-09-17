# Plano de Acao - fotonatrip.com

## Concluido
- [x] Landing page (tema escuro + verde, animacoes, responsivo)
- [x] Auth completa (login, cadastro com role fotografo/cliente, esqueci senha)
- [x] Dashboard do fotografo (eventos, upload, configuracoes, preview lightbox)
- [x] Upload de fotos com watermark automatico (Canvas API)
- [x] Reconhecimento facial no browser (face-api.js, 128d embeddings)
- [x] Busca por selfie com pgvector (threshold 0.92)
- [x] Paginas publicas de eventos com paginacao e lightbox
- [x] Foto de capa nos eventos
- [x] Reprocessar rostos em fotos ja enviadas
- [x] Supabase configurado (schema, RLS, storage, pgvector hnsw)
- [x] Commit e push no GitHub

## Proximas etapas

### 1. Deploy no Vercel (prioridade alta)
- Conectar repo do GitHub ao Vercel
- Configurar variaveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Configurar dominio fotonatrip.com
- Testar todas as paginas em producao

### 2. Configurar emails do Supabase (prioridade alta)
- Definir Site URL nas configuracoes do Supabase (URL do Vercel ou dominio)
- Adicionar redirect URLs permitidos
- Testar fluxo completo de "Esqueci minha senha"
- Customizar template dos emails (logo, cores, portugues)

### 3. Compra de fotos - Mercado Pago (prioridade alta)
- Criar conta Mercado Pago do fotografo
- Integrar Mercado Pago Checkout Pro (split payment, 7% comissao)
- Pagina de compra individual e pacote de fotos
- Apos pagamento: liberar download da foto original (sem watermark)
- Historico de compras do cliente
- Relatorio de vendas do fotografo

### 4. Melhorias de UX (prioridade media)
- Carrinho de compras (selecionar varias fotos antes de pagar)
- Notificacoes por email quando novas fotos sao encontradas
- Compartilhar resultado da busca
- Filtros na busca (por evento, data, cidade)
- Pagina de perfil do fotografo (portfolio publico)

### 5. Backend de producao - FastAPI (prioridade media)
- Migrar reconhecimento facial para servidor (InsightFace, 512d, mais preciso)
- Processar fotos em background (fila async)
- Gerar watermarks no servidor (mais seguro)
- API de webhook para Mercado Pago

### 6. Antes de lancar (checklist)
- [ ] Remover pagina /debug
- [ ] Termos de uso e politica de privacidade
- [ ] SEO (meta tags, Open Graph, sitemap)
- [ ] Analytics (Google Analytics ou Plausible)
- [ ] Testes em mobile
- [ ] Compressao e lazy loading de imagens
- [ ] Rate limiting na busca facial
- [ ] Backup automatico do banco
