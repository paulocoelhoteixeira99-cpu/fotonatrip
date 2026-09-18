import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formData, orderId } = body;

    if (!formData || !orderId) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check if this order uses marketplace (photographer with MP connected)
    let accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN!;
    let applicationFee: number | undefined;

    // Get order to know the platform_fee, then check photographer
    const { data: order } = await supabase
      .from("orders")
      .select("id, platform_fee_cents")
      .eq("id", orderId)
      .single();

    if (order) {
      // Get the photographer from order items (all items same photographer for marketplace)
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("photographer_id")
        .eq("order_id", orderId)
        .limit(1);

      if (orderItems?.length) {
        const { data: photographer } = await supabase
          .from("photographers")
          .select("mp_access_token, mp_user_id")
          .eq("id", orderItems[0].photographer_id)
          .single();

        if (photographer?.mp_access_token && photographer?.mp_user_id) {
          // Marketplace: use photographer's token + application_fee
          accessToken = photographer.mp_access_token;
          applicationFee = order.platform_fee_cents / 100; // 7% in BRL
        }
      }
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    const isPix = formData.payment_method_id === "pix";

    const paymentBody: Record<string, unknown> = {
      transaction_amount: formData.transaction_amount,
      description: "Fotos profissionais - fotonatrip",
      payment_method_id: formData.payment_method_id,
      payer: {
        email: formData.payer?.email,
        identification: formData.payer?.identification,
      },
      external_reference: orderId,
    };

    // Card-specific fields
    if (!isPix) {
      paymentBody.token = formData.token;
      paymentBody.installments = formData.installments;
      paymentBody.issuer_id = formData.issuer_id;
    }

    if (applicationFee) {
      paymentBody.application_fee = applicationFee;
    }

    const result = await payment.create({ body: paymentBody as never });

    // Update order with payment info
    let orderStatus: string;
    switch (result.status) {
      case "approved":
        orderStatus = "paid";
        break;
      case "rejected":
        orderStatus = "failed";
        break;
      case "in_process":
      case "pending":
        orderStatus = "pending";
        break;
      default:
        orderStatus = "pending";
    }

    await supabase
      .from("orders")
      .update({
        status: orderStatus,
        payment_id: String(result.id),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Build response
    const response: Record<string, unknown> = {
      status: result.status,
      status_detail: result.status_detail,
      payment_id: result.id,
    };

    // Include Pix QR code data when available
    const pixData = (result as unknown as Record<string, unknown>).point_of_interaction as
      | { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } }
      | undefined;

    if (pixData?.transaction_data) {
      response.pix = {
        qr_code: pixData.transaction_data.qr_code,
        qr_code_base64: pixData.transaction_data.qr_code_base64,
        ticket_url: pixData.transaction_data.ticket_url,
      };
    }

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("Process payment error:", err);
    const message = err instanceof Error ? err.message : "Erro ao processar pagamento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
