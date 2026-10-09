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
  const { items, packages, coupon_code } = body as {
    items?: { photo_id: string; event_id: string; photographer_id: string }[];
    packages?: { event_id: string; photo_ids: string[]; photographer_id: string }[];
    coupon_code?: string;
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
  const mpItems: { id: string; title: string; description: string; quantity: number; unit_price: number; currency_id: string; category_id: string }[] = [];

  // Get event data for item descriptions and shared event logic
  const eventIds = [...new Set(photos.map((p) => p.event_id))];
  const { data: eventTitles } = await supabase
    .from("events")
    .select("id, title, is_shared, collaborator_commission_pct, photographer_id")
    .in("id", eventIds);
  const eventMap = new Map((eventTitles || []).map((e) => [e.id, e.title]));

  // Check if any event in the order is shared
  const hasSharedEvent = (eventTitles || []).some((e) => e.is_shared);
  const eventsFullMap = new Map((eventTitles || []).map((e) => [e.id, e]));

  for (const photo of individualPhotos) {
    const eventTitle = eventMap.get(photo.event_id) || "Evento";
    mpItems.push({
      id: photo.id,
      title: "Foto profissional - fotonatrip",
      description: `Foto digital sem marca d'agua do evento "${eventTitle}". Entrega imediata via download apos confirmacao do pagamento.`,
      quantity: 1,
      unit_price: photo.price_cents / 100,
      currency_id: "BRL",
      category_id: "services",
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
      description: `Pacote com ${pkgPhotoCount} fotos digitais sem marca d'agua do evento "${eventData.title}". Entrega imediata via download apos confirmacao do pagamento.`,
      quantity: 1,
      unit_price: eventData.package_price_cents / 100,
      currency_id: "BRL",
      category_id: "services",
    });
  }

  // Validate and apply coupon
  let couponId: string | null = null;
  let couponCodeFinal: string | null = null;
  let discountCents = 0;

  if (coupon_code) {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const supa = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: coupon } = await supa
      .from("coupons")
      .select("*")
      .eq("code", coupon_code.toUpperCase().trim())
      .single();

    if (coupon && coupon.active) {
      const notExpired = !coupon.expires_at || new Date(coupon.expires_at) >= new Date();
      const notMaxed = coupon.max_uses === null || coupon.used_count < coupon.max_uses;
      const meetsMin = !coupon.min_order_cents || totalCents >= coupon.min_order_cents;

      if (notExpired && notMaxed && meetsMin) {
        couponId = coupon.id;
        couponCodeFinal = coupon.code;

        if (coupon.discount_type === "percentage") {
          discountCents = Math.round(totalCents * (coupon.discount_value / 100));
        } else {
          discountCents = coupon.discount_value;
        }
        discountCents = Math.min(discountCents, totalCents);

        // Increment used_count
        await supa
          .from("coupons")
          .update({ used_count: coupon.used_count + 1 })
          .eq("id", coupon.id);
      }
    }
  }

  const finalTotalCents = totalCents - discountCents;
  const platformFeeCents = Math.round(finalTotalCents * 0.07); // 7% commission

  // Get user email
  const email = user.email || "";

  // Check if all photos are from a single photographer with MP connected
  // If ANY event is shared, disable marketplace split for the entire order
  const photographerIds = [...new Set(photos.map((p) => p.photographer_id))];
  let useMarketplace = false;
  let photographerAccessToken: string | null = null;

  if (!hasSharedEvent && photographerIds.length === 1) {
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
      total_cents: finalTotalCents,
      platform_fee_cents: platformFeeCents,
      photographer_id: photographerIds.length === 1 ? photographerIds[0] : null,
      coupon_id: couponId,
      coupon_code: couponCodeFinal,
      discount_cents: discountCents,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Order creation error:", orderError);
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 });
  }

  // Create order items for ALL photos (individual + package)
  // Track package distribution to fix rounding on last item
  const pkgDistributed = new Map<string, { total: number; distributed: number; count: number; current: number }>();

  const orderItems = photos.map((photo) => {
    const pkg = packages?.find((p) => p.photo_ids.includes(photo.id));
    let priceCents = photo.price_cents;
    if (pkg) {
      const eventData = packageEvents.find((e) => e.id === pkg.event_id);
      if (eventData?.package_price_cents) {
        const key = pkg.event_id;
        if (!pkgDistributed.has(key)) {
          pkgDistributed.set(key, { total: eventData.package_price_cents, distributed: 0, count: pkg.photo_ids.length, current: 0 });
        }
        const tracker = pkgDistributed.get(key)!;
        tracker.current++;
        if (tracker.current === tracker.count) {
          // Last item gets remainder to avoid rounding drift
          priceCents = tracker.total - tracker.distributed;
        } else {
          priceCents = Math.round(eventData.package_price_cents / pkg.photo_ids.length);
          tracker.distributed += priceCents;
        }
      }
    }

    return {
      order_id: order.id,
      photo_id: photo.id,
      photographer_id: photo.photographer_id,
      price_cents: priceCents,
    };
  });

  // Distribute coupon discount proportionally across items
  if (discountCents > 0 && totalCents > 0) {
    const ratio = finalTotalCents / totalCents;
    let distributed = 0;
    for (let i = 0; i < orderItems.length; i++) {
      if (i === orderItems.length - 1) {
        // Last item gets remainder to avoid rounding drift
        orderItems[i].price_cents = Math.max(0, finalTotalCents - distributed);
      } else {
        orderItems[i].price_cents = Math.round(orderItems[i].price_cents * ratio);
        distributed += orderItems[i].price_cents;
      }
    }
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("Order items error:", itemsError);
    return NextResponse.json({ error: "Erro ao criar itens do pedido" }, { status: 500 });
  }

  // Fetch inserted order_items with IDs for payout creation
  const { data: insertedItems } = await supabase
    .from("order_items")
    .select("id, photo_id, photographer_id, price_cents")
    .eq("order_id", order.id);

  // Create payouts for shared events (or when order has any shared event)
  if (hasSharedEvent && insertedItems) {
    const payoutRows: {
      type: string;
      photographer_id: string;
      order_item_id: string;
      event_id: string;
      amount_cents: number;
      commission_pct: number | null;
    }[] = [];

    for (const item of insertedItems) {
      const photo = photos.find((p) => p.id === item.photo_id);
      if (!photo) continue;

      const eventData = eventsFullMap.get(photo.event_id);
      if (!eventData) continue;

      const itemPrice = item.price_cents;
      const platformFee = Math.round(itemPrice * 0.07);
      const afterPlatform = itemPrice - platformFee;

      if (eventData.is_shared) {
        if (photo.photographer_id === eventData.photographer_id) {
          // Host's own photo in shared event: host gets 93%
          payoutRows.push({
            type: "host_own_photos",
            photographer_id: eventData.photographer_id,
            order_item_id: item.id,
            event_id: photo.event_id,
            amount_cents: afterPlatform,
            commission_pct: null,
          });
        } else {
          // Collaborator's photo: host gets commission%, collaborator gets rest
          const commissionPct = eventData.collaborator_commission_pct;
          const hostCommission = Math.round(itemPrice * commissionPct / 100);
          const collaboratorAmount = afterPlatform - hostCommission;

          payoutRows.push({
            type: "host_commission",
            photographer_id: eventData.photographer_id,
            order_item_id: item.id,
            event_id: photo.event_id,
            amount_cents: hostCommission,
            commission_pct: commissionPct,
          });

          payoutRows.push({
            type: "collaborator_payout",
            photographer_id: photo.photographer_id,
            order_item_id: item.id,
            event_id: photo.event_id,
            amount_cents: collaboratorAmount,
            commission_pct: commissionPct,
          });
        }
      } else {
        // Non-shared event in mixed order: host gets 93% via payout
        payoutRows.push({
          type: "host_own_photos",
          photographer_id: photo.photographer_id,
          order_item_id: item.id,
          event_id: photo.event_id,
          amount_cents: afterPlatform,
          commission_pct: null,
        });
      }
    }

    if (payoutRows.length > 0) {
      const { error: payoutError } = await supabase
        .from("payouts")
        .insert(payoutRows);

      if (payoutError) {
        console.error("Payout creation error:", payoutError);
        // Don't fail the order — payouts can be reconciled later
      }
    }
  }

  // If total is zero (100% coupon), mark as paid immediately — no MP needed
  if (finalTotalCents <= 0) {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await serviceSupabase
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    return NextResponse.json({
      order_id: order.id,
      free: true,
    });
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

    // If coupon applied, adjust item prices proportionally for MP
    if (discountCents > 0 && totalCents > 0) {
      const ratio = finalTotalCents / totalCents;
      for (const item of mpItems) {
        item.unit_price = Math.round(item.unit_price * ratio * 100) / 100;
      }
    }

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
      amount: finalTotalCents / 100,
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
