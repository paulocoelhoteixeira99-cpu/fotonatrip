# Checkout com Mercado Pago - Design

## Resumo
Sistema de carrinho + checkout para compra de fotos com Mercado Pago Checkout Pro e split payment (7% comissao plataforma, 93% fotografo).

## Fluxo do Cliente
1. Busca facial -> fotos com watermark e preco
2. "Adicionar ao carrinho" em cada foto
3. Badge no header com quantidade de itens
4. Pagina /carrinho com resumo (fotos, evento, fotografo, preco)
5. "Finalizar compra" -> Mercado Pago Checkout Pro
6. Pagamento (PIX, cartao, boleto)
7. Retorno -> /checkout/sucesso com botao "Baixar fotos"
8. /minhas-compras -> historico + downloads das originais

### Carrinho
- localStorage (sem login pra adicionar)
- Login exigido ao finalizar
- Thumbnail com watermark, evento, preco
- Remover itens individualmente

## Fluxo do Fotografo
### Preco por evento
- Campo "Preco por foto" na pagina do evento no dashboard
- Default R$15,00
- Atualiza todas as fotos do evento

### Conexao Mercado Pago
- Botao "Conectar Mercado Pago" nas configuracoes
- OAuth: redireciona MP -> autoriza -> volta com token
- Status visivel: Conectado/Pendente
- Sem conexao = nao pode vender

### Dashboard de Vendas
- Cards: receita total, vendas do mes, fotos vendidas, taxa conversao
- Grafico: vendas ultimos 30 dias
- Lista vendas recentes: data, foto, evento, valor liquido
- Ranking de eventos por vendas

## Paginas Novas
- /carrinho
- /checkout/sucesso
- /checkout/falha
- /minhas-compras
- /api/checkout (criar preferencia MP)
- /api/webhook/mercadopago (notificacoes de pagamento)

## Modelo de Dados (ja existe)
- orders: status, total_cents, platform_fee_cents, payment_id
- order_items: order_id, photo_id, photographer_id, price_cents
- photos.price_cents atualizado pelo preco do evento
- photographers.mercado_pago_id para OAuth

## Stack
- Mercado Pago Checkout Pro (SDK JS + API server-side)
- Split payment via marketplace
- Next.js Route Handlers para API
- localStorage para carrinho
