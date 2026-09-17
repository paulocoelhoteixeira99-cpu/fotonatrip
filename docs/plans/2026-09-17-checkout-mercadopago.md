# Checkout Mercado Pago - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a cart + checkout system with Mercado Pago split payments (7% platform commission), photographer sales dashboard, and photo download after purchase.

**Architecture:** Cart stored in localStorage via React Context. Checkout creates an order in Supabase, then redirects to Mercado Pago Checkout Pro. MP webhook confirms payment and updates order status. Photographers connect MP via OAuth and set prices per event. Sales dashboard queries orders/order_items.

**Tech Stack:** mercadopago SDK (Node), React Context + localStorage (cart), Next.js Route Handlers (API), Supabase (orders, RLS), Framer Motion (UI animations)

---

### Task 1: Database Migration - Add missing columns and update schema

**Files:**
- Create: `supabase/migrations/007_checkout_schema.sql`

**What:** Add columns for MP OAuth tokens on photographers, event-level pricing, and download tracking. Update orders table with MP-specific fields.

```sql
-- Add event-level pricing
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_per_photo_cents INT NOT NULL DEFAULT 1500;

-- Add MP OAuth fields to photographers
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT;
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS mp_user_id TEXT;

-- Add download tracking to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ;

-- Function to sync event price to all its photos
CREATE OR REPLACE FUNCTION sync_event_photo_prices()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE photos SET price_cents = NEW.price_per_photo_cents
  WHERE event_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_event_prices
  AFTER UPDATE OF price_per_photo_cents ON events
  FOR EACH ROW
  WHEN (OLD.price_per_photo_cents IS DISTINCT FROM NEW.price_per_photo_cents)
  EXECUTE FUNCTION sync_event_photo_prices();

-- Also sync on photo insert (new photos get event price)
CREATE OR REPLACE FUNCTION set_photo_price_from_event()
RETURNS TRIGGER AS $$
BEGIN
  SELECT price_per_photo_cents INTO NEW.price_cents
  FROM events WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_photo_price
  BEFORE INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION set_photo_price_from_event();

-- RLS: clients can view their purchased photos' original paths
CREATE POLICY "Clients can view purchased photo originals"
  ON photos FOR SELECT
  USING (
    id IN (
      SELECT oi.photo_id FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.client_id = auth.uid() AND o.status = 'paid'
    )
  );

-- RLS: allow webhook to update orders (via service role, no policy needed)
-- RLS: clients can insert orders
CREATE POLICY "Clients can create orders"
  ON orders FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- RLS: clients can view own orders
CREATE POLICY "Clients can view own orders"
  ON orders FOR SELECT
  USING (client_id = auth.uid());

-- RLS: photographers can view orders containing their photos
CREATE POLICY "Photographers can view their sales"
  ON order_items FOR SELECT
  USING (photographer_id = auth.uid());
```

**Step:** Run this migration in Supabase SQL editor, then save the file locally.

**Commit:** `feat: migration 007 - checkout schema (event pricing, MP OAuth, RLS)`

---

### Task 2: Install Mercado Pago SDK + Environment Variables

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

**Step 1:** Install SDK
```bash
npm install mercadopago
```

**Step 2:** Add env vars to `.env.local`:
```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx
MERCADOPAGO_CLIENT_ID=xxxxxxxx
MERCADOPAGO_CLIENT_SECRET=xxxxxxxx
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx
NEXT_PUBLIC_APP_URL=https://fotonatrip.vercel.app
```

**Step 3:** Add env vars to Vercel:
```bash
npx vercel env add MERCADOPAGO_ACCESS_TOKEN production
npx vercel env add MERCADOPAGO_PUBLIC_KEY production
npx vercel env add MERCADOPAGO_CLIENT_ID production
npx vercel env add MERCADOPAGO_CLIENT_SECRET production
npx vercel env add NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY production
npx vercel env add NEXT_PUBLIC_APP_URL production
```

**Commit:** `chore: add mercadopago SDK and env vars`

---

### Task 3: Cart Context + Provider (localStorage)

**Files:**
- Create: `src/lib/cart.tsx`
- Modify: `src/app/layout.tsx` (wrap with CartProvider)

**What:** React Context that stores cart items in localStorage. Provides add, remove, clear, and count. Cart items store photo_id, event_id, event_title, photographer_name, photographer_id, price_cents, watermark_url.

**CartItem interface:**
```typescript
interface CartItem {
  photo_id: string;
  event_id: string;
  event_title: string;
  photographer_name: string;
  photographer_id: string;
  price_cents: number;
  watermark_url: string;
}
```

**Context API:**
```typescript
interface CartContext {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (photo_id: string) => void;
  clearCart: () => void;
  isInCart: (photo_id: string) => boolean;
  totalCents: number;
  count: number;
}
```

**Implementation notes:**
- Use `useState` + `useEffect` to hydrate from localStorage on mount
- Avoid SSR hydration mismatch: initialize with empty array, load from localStorage in useEffect
- Save to localStorage on every change via useEffect
- localStorage key: `fotonatrip_cart`

**Commit:** `feat: cart context with localStorage persistence`

---

### Task 4: Add "Add to Cart" Buttons

**Files:**
- Modify: `src/app/buscar/page.tsx` (search results - add cart button per photo)
- Modify: `src/app/eventos/[id]/page.tsx` (event detail - add cart button per photo + in lightbox)

**What:** Add a shopping cart button to each photo card. If already in cart, show "No carrinho" with checkmark. Use the `useCart()` hook.

**On search results (buscar/page.tsx):**
- Add button next to the price display on each result card
- Button: ShoppingCart icon + "Adicionar" or Check icon + "No carrinho"
- Green primary style when not in cart, muted style when in cart

**On event detail (eventos/[id]/page.tsx):**
- Add button on photo hover overlay (grid view)
- Add button in lightbox info bar next to price
- Same toggle behavior

**Commit:** `feat: add-to-cart buttons on search results and event pages`

---

### Task 5: Cart Badge in Header + Cart Sidebar/Drawer

**Files:**
- Modify: `src/components/Header.tsx` (add cart icon with badge count)

**What:** Add ShoppingCart icon in header nav area (before login/user button). Show badge with item count when > 0. Clicking navigates to /carrinho.

**Badge:** Small green circle with count, positioned top-right of cart icon. Animate in with scale.

**Commit:** `feat: cart badge in header navigation`

---

### Task 6: Cart Page (/carrinho)

**Files:**
- Create: `src/app/carrinho/page.tsx`

**What:** Full cart page showing all items grouped by event/photographer. Summary sidebar with total and "Finalizar Compra" button.

**Layout:**
- Left: List of cart items (photo thumbnail with watermark, event name, photographer, price, remove button)
- Right (or bottom on mobile): Order summary card (subtotal, items count, "Finalizar Compra" button)
- Empty state: "Seu carrinho esta vazio" with CTA to search photos

**Group by event:** Items from same event grouped under event title header.

**Price format:** `R$ XX,XX` (Brazilian format)

**"Finalizar Compra" button:**
- If not logged in: redirect to `/login?next=/carrinho`
- If logged in: POST to `/api/checkout` with cart items, then redirect to MP checkout URL

**Commit:** `feat: cart page with grouped items and checkout CTA`

---

### Task 7: Event Price Setting in Photographer Dashboard

**Files:**
- Modify: `src/app/dashboard/eventos/[id]/page.tsx` (add price input field)

**What:** Add "Preco por foto" input field in the event management page. On save, updates `events.price_per_photo_cents` which triggers the DB function to sync all photo prices.

**UI:** Input with "R$" prefix, type number, step 0.01. Convert to cents on save. Show current price. Place near top of page with event info.

**Commit:** `feat: event price setting in photographer dashboard`

---

### Task 8: Mercado Pago OAuth for Photographers

**Files:**
- Create: `src/app/api/mp/connect/route.ts` (redirect to MP OAuth)
- Create: `src/app/api/mp/callback/route.ts` (receive OAuth code, store tokens)
- Modify: `src/app/dashboard/configuracoes/page.tsx` (add "Conectar Mercado Pago" button + status)

**OAuth Flow:**
1. Photographer clicks "Conectar Mercado Pago" in settings
2. GET `/api/mp/connect` redirects to MP authorization URL
3. Photographer authorizes on Mercado Pago
4. MP redirects back to `/api/mp/callback?code=XXX`
5. Exchange code for access_token + refresh_token
6. Store tokens in photographers table (mp_access_token, mp_refresh_token, mp_user_id)
7. Redirect to `/dashboard/configuracoes?mp=connected`

**Settings page update:**
- Show connection status: green badge "Conectado" or yellow "Pendente"
- If connected: show MP user email/name
- If not connected: show "Conectar Mercado Pago" button with MP logo
- Warning banner if not connected: "Conecte sua conta do Mercado Pago para receber pagamentos"

**Commit:** `feat: Mercado Pago OAuth connection for photographers`

---

### Task 9: Checkout API Route

**Files:**
- Create: `src/app/api/checkout/route.ts`

**What:** POST endpoint that receives cart items, creates order in Supabase, creates MP Preference with split payment, returns checkout URL.

**Flow:**
1. Validate user is authenticated
2. Validate all photo_ids exist and are ready
3. Fetch current prices from DB (don't trust client prices)
4. Fetch photographer MP tokens for split payment
5. Create order + order_items in Supabase (status: pending)
6. Create Mercado Pago Preference:
   - items: each photo as line item
   - marketplace_fee: 7% of total (platform commission)
   - back_urls: success/failure/pending -> /checkout/sucesso, /checkout/falha
   - external_reference: order.id
   - notification_url: /api/webhook/mercadopago
   - For split: use each photographer's access_token
7. Return { checkout_url: preference.init_point }

**Split payment logic:**
- Group cart items by photographer
- For each photographer group, create payment split with their MP access_token
- Platform keeps 7% (marketplace_fee)

**Note:** If multiple photographers in one order, may need multiple preferences or use marketplace model. Simplification for MVP: one preference with marketplace_fee, photographer identified via external_reference.

**Commit:** `feat: checkout API with Mercado Pago preference creation`

---

### Task 10: Mercado Pago Webhook

**Files:**
- Create: `src/app/api/webhook/mercadopago/route.ts`

**What:** POST endpoint that receives MP payment notifications, validates, and updates order status.

**Flow:**
1. Receive notification (topic: payment, id: payment_id)
2. Fetch payment details from MP API using payment_id
3. Find order by external_reference (order.id)
4. Update order status based on payment status:
   - approved -> paid
   - rejected -> failed
   - refunded -> refunded
   - pending -> pending
5. If paid: store payment_id in order

**Security:** Validate the notification comes from MP (check payment exists via MP API).

**Commit:** `feat: Mercado Pago webhook for payment notifications`

---

### Task 11: Success and Failure Pages

**Files:**
- Create: `src/app/checkout/sucesso/page.tsx`
- Create: `src/app/checkout/falha/page.tsx`

**Success page:**
- Clear cart (localStorage)
- Show success message with confetti/animation
- "Baixar minhas fotos" button -> /minhas-compras
- Show order summary (total, number of photos)
- Query order by payment_id from URL params

**Failure page:**
- Show error message
- "Tentar novamente" button -> /carrinho
- "Voltar para busca" button -> /buscar

**Commit:** `feat: checkout success and failure pages`

---

### Task 12: My Purchases Page (/minhas-compras)

**Files:**
- Create: `src/app/minhas-compras/page.tsx`

**What:** Client area showing all purchased photos with download buttons.

**Layout:**
- List of orders grouped by date
- Each order shows: date, status, total, photos
- Each photo: thumbnail, event name, download button (original without watermark)
- Download: fetch original from Supabase storage (storage_path, not watermark_path)

**Download logic:**
- Only show download for orders with status = 'paid'
- Use Supabase storage `createSignedUrl()` for secure temporary download links
- Track download in order_items.downloaded_at

**Protected route:** Must be logged in (add to middleware).

**Commit:** `feat: my purchases page with photo download`

---

### Task 13: Photographer Sales Dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx` (replace hardcoded 0 stats with real data)
- Create: `src/app/dashboard/vendas/page.tsx` (detailed sales page)
- Modify: `src/app/dashboard/layout.tsx` (add "Vendas" nav item)

**Dashboard page updates:**
- Receita total: SUM of order_items.price_cents where photographer_id = me and order.status = paid, minus 7%
- Vendas do mes: same but filtered by current month
- Fotos vendidas: COUNT of paid order_items
- Taxa de conversao: paid order_items / total photos

**Vendas page:**
- Cards: Receita total, Receita do mes, Fotos vendidas, Ticket medio
- Chart: Vendas dos ultimos 30 dias (simple bar chart with CSS/divs, no chart library)
- Table: vendas recentes (data, foto thumbnail, evento, valor bruto, comissao 7%, valor liquido)
- Filter by event (dropdown)

**Commit:** `feat: photographer sales dashboard with real data`

---

### Task 14: Update Middleware + Navigation

**Files:**
- Modify: `src/middleware.ts` (protect /minhas-compras, /carrinho checkout flow)
- Modify: `src/components/Header.tsx` (add "Minhas Compras" link for logged-in clients)

**Middleware updates:**
- `/minhas-compras` -> require auth (any role)
- `/api/checkout` -> require auth
- `/api/mp/*` -> require auth + photographer role

**Header updates:**
- For clients: show "Minhas Compras" link in user dropdown/menu
- For photographers: existing dashboard link stays

**Commit:** `feat: update middleware and navigation for checkout flow`

---

## Execution Order

1. Task 1 (DB migration) - foundation
2. Task 2 (SDK + env) - dependencies
3. Task 3 (Cart context) - core state management
4. Task 5 (Cart badge header) - visibility
5. Task 4 (Add to cart buttons) - user interaction
6. Task 6 (Cart page) - review & checkout entry
7. Task 7 (Event pricing) - photographer config
8. Task 8 (MP OAuth) - photographer connection
9. Task 9 (Checkout API) - payment flow
10. Task 10 (Webhook) - payment confirmation
11. Task 11 (Success/failure pages) - post-payment UX
12. Task 12 (My purchases) - photo delivery
13. Task 13 (Sales dashboard) - photographer analytics
14. Task 14 (Middleware + nav) - security & polish
