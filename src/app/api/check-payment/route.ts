import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return NextResponse.json({ error: "order_id obrigatorio" }, { status: 400 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, payment_id, client_id")
    .eq("id", orderId)
    .eq("client_id", user.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Pedido nao encontrado" }, { status: 404 });
  }

  if (order.status === "paid") {
    return NextResponse.json({ status: "paid" });
  }

  if (!order.payment_id) {
    return NextResponse.json({ status: order.status });
  }

  // Check directly with Mercado Pago
  const paymentId = parseInt(order.payment_id);
  let paymentData = await fetchFromMP(paymentId, supabase);

  if (paymentData) {
    let newStatus: string;
    switch (paymentData.status) {
      case "approved":
        newStatus = "paid";
        break;
      case "rejected":
      case "cancelled":
        newStatus = "failed";
        break;
      case "refunded":
        newStatus = "refunded";
        break;
      default:
        newStatus = "pending";
    }

    if (newStatus !== order.status) {
      await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);
    }

    return NextResponse.json({ status: newStatus });
  }

  return NextResponse.json({ status: order.status });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFromMP(paymentId: number, supabase: any) {
  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });
    const result = await new Payment(client).get({ id: paymentId });
    if (result?.id) return result;
  } catch {
    // Platform token failed, try photographer tokens
  }

  const { data: photographers } = await supabase
    .from("photographers")
    .select("mp_access_token")
    .not("mp_access_token", "is", null);

  for (const p of photographers || []) {
    try {
      const client = new MercadoPagoConfig({
        accessToken: p.mp_access_token,
      });
      const result = await new Payment(client).get({ id: paymentId });
      if (result?.id) return result;
    } catch {
      continue;
    }
  }

  return null;
}
