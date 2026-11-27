/**
 * Diagnostico de evento — verifica trafego, fotos, embeddings, buscas e vendas.
 * Uso: node scripts/diagnose-event.mjs "TITULO_OU_ID"
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(import.meta.dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const search = process.argv[2];
if (!search) { console.error("Uso: node scripts/diagnose-event.mjs \"TITULO_OU_ID\""); process.exit(1); }

// Find event
const isUUID = /^[0-9a-f-]{36}$/.test(search);
const { data: events } = isUUID
  ? await supabase.from("events").select("*").eq("id", search)
  : await supabase.from("events").select("*").ilike("title", `%${search}%`);

if (!events || events.length === 0) { console.error("Evento nao encontrado."); process.exit(1); }
const event = events[0];

console.log(`\n=== EVENTO: ${event.title} ===`);
console.log(`ID: ${event.id}`);
console.log(`Status: ${event.status}`);
console.log(`Preco: R$ ${(event.price_cents / 100).toFixed(2)}`);
if (event.package_price_cents) console.log(`Pacote: R$ ${(event.package_price_cents / 100).toFixed(2)}`);
console.log(`Data: ${event.event_date || "nao definida"}`);
console.log(`Criado: ${event.created_at}`);

// Photos
const { count: totalPhotos } = await supabase
  .from("photos")
  .select("id", { count: "exact", head: true })
  .eq("event_id", event.id)
  .eq("status", "ready");

console.log(`\n--- FOTOS ---`);
console.log(`Total (ready): ${totalPhotos}`);

// Photos with embeddings
const withEmb = new Set();
let offset = 0;
while (true) {
  const { data } = await supabase
    .from("photos")
    .select("id, face_embeddings!inner(photo_id)")
    .eq("event_id", event.id)
    .range(offset, offset + 999);
  if (!data || data.length === 0) break;
  data.forEach((p) => withEmb.add(p.id));
  if (data.length < 1000) break;
  offset += 1000;
}
console.log(`Com rosto detectado: ${withEmb.size}`);
console.log(`Sem rosto: ${totalPhotos - withEmb.size}`);

// Total embeddings
const { count: totalEmbeddings } = await supabase
  .from("face_embeddings")
  .select("id", { count: "exact", head: true })
  .in("photo_id", [...withEmb].slice(0, 100)); // sample
console.log(`Embeddings (amostra 100 fotos): ${totalEmbeddings}`);

// Page views
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const { count: viewCount } = await supabase
  .from("page_views")
  .select("id", { count: "exact", head: true })
  .eq("event_id", event.id)
  .gte("created_at", thirtyDaysAgo.toISOString());

const { data: viewData } = await supabase
  .from("page_views")
  .select("session_id, created_at, path, user_agent")
  .eq("event_id", event.id)
  .gte("created_at", thirtyDaysAgo.toISOString())
  .order("created_at", { ascending: false })
  .limit(500);

const sessions = new Set((viewData || []).map(v => v.session_id));
const botViews = (viewData || []).filter(v =>
  /bot|crawl|spider|slurp|googlebot|bingpreview|facebookexternalhit|semrush|ahrefs|gptbot|claudebot/i.test(v.user_agent || "")
);

console.log(`\n--- TRAFEGO (ultimos 30 dias) ---`);
console.log(`Page views total: ${viewCount}`);
console.log(`Sessoes unicas: ${sessions.size}`);
console.log(`Views de bots: ${botViews.length}`);
console.log(`Views humanos: ${(viewData || []).length - botViews.length}`);

// Check /buscar views (facial search page)
const { data: buscarViews } = await supabase
  .from("page_views")
  .select("session_id, path")
  .eq("event_id", event.id)
  .gte("created_at", thirtyDaysAgo.toISOString())
  .like("path", "%buscar%");

console.log(`Views na pagina /buscar: ${(buscarViews || []).length}`);

// Recent views by day
const dayMap = new Map();
for (const v of (viewData || [])) {
  if (/bot|crawl|spider|googlebot/i.test(v.user_agent || "")) continue;
  const day = new Date(v.created_at).toISOString().split("T")[0];
  dayMap.set(day, (dayMap.get(day) || 0) + 1);
}
if (dayMap.size > 0) {
  console.log(`\nViews por dia (humanos):`);
  const sorted = [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);
  for (const [day, count] of sorted) {
    console.log(`  ${day}: ${count} views`);
  }
}

// Orders
const { data: orderItems } = await supabase
  .from("order_items")
  .select("id, order_id, price_cents, orders!inner(status, created_at, payment_method)")
  .eq("orders.status", "paid")
  .in("photo_id", [...withEmb].slice(0, 100)); // limited sample

// Better: check orders via photos in this event
const { data: eventPhotos } = await supabase
  .from("photos")
  .select("id")
  .eq("event_id", event.id)
  .limit(10);

const photoSample = (eventPhotos || []).map(p => p.id);
const { count: orderItemCount } = await supabase
  .from("order_items")
  .select("id", { count: "exact", head: true })
  .in("photo_id", photoSample);

console.log(`\n--- VENDAS ---`);
console.log(`Order items (amostra 10 fotos): ${orderItemCount}`);

// Check all orders for this event's photos
const { data: allOrderItems } = await supabase
  .from("order_items")
  .select("id, photo_id, price_cents, orders!inner(id, status, created_at)")
  .in("photo_id", photoSample);

const paidItems = (allOrderItems || []).filter(i => i.orders?.status === "paid");
const pendingItems = (allOrderItems || []).filter(i => i.orders?.status === "pending");
console.log(`  Pagos: ${paidItems.length}`);
console.log(`  Pendentes: ${pendingItems.length}`);

console.log(`\n=== FIM DO DIAGNOSTICO ===\n`);
