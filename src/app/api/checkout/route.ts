import { createClient } from "@/lib/supabase/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { items, packages } = body as {
    items?: { photo_id: string; event_id: string; photographer_id: string }[];
    packages?: { event_id: string; photo_ids: string[]; photographer_id: string }[];
  };

  const hasItems = items && items.length > 0;
  const hasPackages = packages && packages.length > 0;

  if (!hasItems && !hasPackages) {
    return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
  }

  // Collect all photo IDs (individual + package)
  const individualPhotoIds = items?.map((i) => i.photo_id) || [];
  const packagePhotoIds = packages?.flatMap((p) => p.photo_ids) || [];
  const allPhotoIds = [...individualPhotoIds, ...packagePhotoIds];

  // Fetch photos with real prices from DB
  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("id, price_cents, event_id, photographer_id, watermark_path, storage_path")
    .in("id", allPhotoIds)
    .eq("status", "ready");

  if (photosError || !photos?.length) {
    return NextResponse.json({ error: "Fotos nao encontradas" }, { status: 400 });
  }

  // Calculate totals
  // Individual photos: sum of their prices
  const individualPhotos = photos.filter((p) => individualPhotoIds.includes(p.id));
  let totalCents = individualPhotos.reduce((sum, p) => sum + p.price_cents, 0);

  // Packages: use event's package_price_cents
  const mpItems: { id: string; title: string; quantity: number; unit_price: number; currency_id: string }[] = [];

  for (const photo of individualPhotos) {
    mpItems.push({
      id: photo.id,
      title: "Foto profissional - fotonatrip",
      quantity: 1,
      unit_price: photo.price_cents / 100,
      currency_id: "BRL",
    });
  }

  const packageEventIds = packages?.map((p) => p.event_id) || [];
  let packageEvents: { id: string; package_price_cents: number; title: string }[] = [];

  if (packageEventIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("id, package_price_cents, title")
      .in("id", packageEventIds);
    packageEvents = events || [];
  }

  for (const pkg of packages || []) {
    const eventData = packageEvents.find((e) => e.id === pkg.event_id);
    if (!eventData?.package_price_cents) continue;

    totalCents += eventData.package_price_cents;
    const pkgPhotoCount = pkg.photo_ids.length;

    mpItems.push({
      id: `pkg_${pkg.event_id}`,
      title: `Pacote ${pkgPhotoCount} fotos - ${eventData.title}`,
      quantity: 1,
      unit_price: eventData.package_price_cents / 100,
      currency_id: "BRL",
    });
  }

  const platformFeeCents = Math.round(totalCents * 0.07); // 7% commission

  // Get user email
  const email = user.email || "";

  // Check if all photos are from a single photographer with MP connected
  const photographerIds = [...new Set(photos.map((p) => p.photographer_id))];
  let useMarketplace = false;
  let photographerAccessToken: string | null = null;

  if (photographerIds.length === 1) {
    const { data: photographer } = await supabase
      .from("photographers")
      .select("mp_access_token, mp_user_id")
      .eq("id", photographerIds[0])
      .single();

    if (photographer?.mp_access_token && photographer?.mp_user_id) {
      useMarketplace = true;
      photographerAccessToken = photographer.mp_access_token;
    }
  }

  // Create order in Supabase
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      client_id: user.id,
      client_email: email,
      status: "pending",
      total_cents: totalCents,
      platform_fee_cents: platformFeeCents,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Order creation error:", orderError);
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 });
  }

  // Create order items for ALL photos (individual + package)
  const orderItems = photos.map((photo) => {
    // For package photos, distribute package price evenly (for record keeping)
    const pkg = packages?.find((p) => p.photo_ids.includes(photo.id));
    let priceCents = photo.price_cents;
    if (pkg) {
      const eventData = packageEvents.find((e) => e.id === pkg.event_id);
      if (eventData?.package_price_cents) {
        priceCents = Math.round(eventData.package_price_cents / pkg.photo_ids.length);
      }
    }

    return {
      order_id: order.id,
      photo_id: photo.id,
      photographer_id: photo.photographer_id,
      price_cents: priceCents,
    };
  });

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("Order items error:", itemsError);
    return NextResponse.json({ error: "Erro ao criar itens do pedido" }, { status: 500 });
  }

  // Create Mercado Pago preference
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fotonatrip.com.br";

  try {
    // Use photographer's token for marketplace, platform's token otherwise
    const accessToken = useMarketplace
      ? photographerAccessToken!
      : process.env.MERCADOPAGO_ACCESS_TOKEN!;

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const preferenceBody: Record<string, unknown> = {
      items: mpItems,
      back_urls: {
        success: `${appUrl}/checkout/sucesso?order=${order.id}`,
        failure: `${appUrl}/checkout/falha?order=${order.id}`,
        pending: `${appUrl}/checkout/sucesso?order=${order.id}&status=pending`,
      },
      auto_return: "approved",
      external_reference: order.id,
      notification_url: `${appUrl}/api/webhook/mercadopago`,
      statement_descriptor: "FOTONATRIP",
      payer: {
        email: email || "fotonatrip2026@gmail.com",
      },
    };

    // Add marketplace_fee for split payment (platform's 7% commission)
    if (useMarketplace) {
      preferenceBody.marketplace_fee = platformFeeCents / 100;
    }

    const result = await preference.create({ body: preferenceBody as never });

    return NextResponse.json({
      preference_id: result.id,
      init_point: result.init_point,
      order_id: order.id,
      amount: totalCents / 100,
      marketplace: useMarketplace,
    });
  } catch (err) {
    console.error("Mercado Pago error:", err);
    return NextResponse.json(
      { error: "Erro ao conectar com Mercado Pago" },
      { status: 500 }
    );
  }
}
