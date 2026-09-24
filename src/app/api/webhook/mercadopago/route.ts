import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// GET endpoint to test if webhook is accessible
export async function GET() {
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasMPToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN;

  return NextResponse.json({
    status: "ok",
    env: {
      supabase_url: hasSupabaseUrl,
      service_key: hasServiceKey,
      mp_token: hasMPToken,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Parse body safely
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      console.log("Webhook: invalid JSON body");
      return NextResponse.json({ received: true });
    }

    console.log("Webhook received:", JSON.stringify(body));

    // Extract payment ID — MP sends it as string or number
    const rawPaymentId = (body.data as Record<string, unknown>)?.id;
    if (!rawPaymentId) {
      console.log("Webhook: no data.id, ignoring");
      return NextResponse.json({ received: true });
    }

    const paymentId = Number(rawPaymentId);
    if (isNaN(paymentId)) {
      console.log("Webhook: invalid payment ID:", rawPaymentId);
      return NextResponse.json({ received: true });
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error("Webhook: missing SUPABASE env vars");
      return NextResponse.json({ received: true });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch payment from Mercado Pago
    const paymentData = await fetchPayment(paymentId, supabase);

    if (!paymentData?.external_reference) {
      console.log("Webhook: could not fetch payment or no external_reference:", paymentId);
      return NextResponse.json({ received: true });
    }

    const orderId = paymentData.external_reference;

    // Map MP status to our status
    let orderStatus: string;
    switch (paymentData.status) {
      case "approved":
        orderStatus = "paid";
        break;
      case "rejected":
      case "cancelled":
        orderStatus = "failed";
        break;
      case "refunded":
        orderStatus = "refunded";
        break;
      default:
        orderStatus = "pending";
    }

    // Don't downgrade a paid order back to pending
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (existingOrder?.status === "paid" && orderStatus === "pending") {
      console.log(`Webhook: order ${orderId} already paid, skipping pending update`);
      return NextResponse.json({ received: true });
    }

    // Update order
    const { error } = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        payment_id: String(paymentId),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Webhook: order update error:", error);
    } else {
      console.log(`Webhook: order ${orderId} updated to ${orderStatus}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // ALWAYS return 200 to MP — otherwise it keeps retrying
    console.error("Webhook error:", err);
    return NextResponse.json({ received: true });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPayment(paymentId: number, supabase: any) {
  // 1. Try with platform's access token
  const platformToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (platformToken) {
    try {
      const client = new MercadoPagoConfig({ accessToken: platformToken });
      const result = await new Payment(client).get({ id: paymentId });
      if (result?.external_reference) return result;
    } catch (err) {
      console.log("Webhook: platform token failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // 2. Fallback: try each photographer's access token (marketplace payments)
  try {
    const { data: photographers } = await supabase
      .from("photographers")
      .select("mp_access_token")
      .not("mp_access_token", "is", null);

    for (const p of photographers || []) {
      try {
        const client = new MercadoPagoConfig({ accessToken: p.mp_access_token });
        const result = await new Payment(client).get({ id: paymentId });
        if (result?.external_reference) return result;
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error("Webhook: photographer token query failed:", err);
  }

  return null;
}
