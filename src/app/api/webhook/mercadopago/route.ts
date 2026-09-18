import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Accept any notification with a payment data.id
    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    // Try to fetch payment details — platform token first, then photographer tokens
    let paymentData = await fetchPayment(paymentId, supabase);

    if (!paymentData?.external_reference) {
      console.log("Could not fetch payment or no external_reference:", paymentId);
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
      console.error("Order update error:", error);
    } else {
      console.log(`Order ${orderId} updated to ${orderStatus}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPayment(paymentId: number, supabase: any) {
  // 1. Try with platform's access token
  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });
    const result = await new Payment(client).get({ id: paymentId });
    if (result?.external_reference) return result;
  } catch (err) {
    console.log("Platform token failed for payment:", paymentId, err);
  }

  // 2. Fallback: try each photographer's access token (marketplace payments)
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
      if (result?.external_reference) return result;
    } catch {
      continue;
    }
  }

  return null;
}
