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
      .select("id, platform_fee_cents, status, payment_id")
      .eq("id", orderId)
      .single();

    // Prevent duplicate payments — if order already paid, return success
    if (order?.status === "paid") {
      return NextResponse.json({ status: "approved", payment_id: order.payment_id });
    }

    // If order already has a payment, check its status before creating a new one
    if (order?.payment_id) {
      try {
        const checkClient = new MercadoPagoConfig({ accessToken });
        const existing = await new Payment(checkClient).get({ id: parseInt(order.payment_id) });
        if (existing?.status === "approved") {
          await supabase
            .from("orders")
            .update({ status: "paid", updated_at: new Date().toISOString() })
            .eq("id", orderId);
          return NextResponse.json({ status: "approved", payment_id: order.payment_id });
        }
      } catch {
        // Could not check existing payment, proceed with new one
      }
    }

    // Get order items with photo/event info for MP additional_info
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, photographer_id, price_cents, photos(event_id, events(title))")
      .eq("order_id", orderId);

    if (order && orderItems?.length) {
      const { data: photographer } = await supabase
        .from("photographers")
        .select("mp_access_token, mp_user_id")
        .eq("id", orderItems[0].photographer_id)
        .single();

      if (photographer?.mp_access_token && photographer?.mp_user_id) {
        accessToken = photographer.mp_access_token;
        applicationFee = order.platform_fee_cents / 100;
      }
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    const isPix = formData.payment_method_id === "pix";

    // For Pix, get payer email from the order if not provided
    let payerEmail = formData.payer?.email;
    if (isPix && !payerEmail && order) {
      const { data: orderData } = await supabase
        .from("orders")
        .select("client_email")
        .eq("id", orderId)
        .single();
      payerEmail = orderData?.client_email;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fotonatrip.com.br";

    // Build items for additional_info
    const eventTitle = (orderItems?.[0] as any)?.photos?.events?.title || "Evento";
    const itemCount = orderItems?.length || 1;
    const mpItems = [{
      id: orderId,
      title: `Fotos profissionais - ${eventTitle}`,
      description: `${itemCount} foto${itemCount !== 1 ? "s" : ""} digital sem marca d'agua do evento "${eventTitle}". Entrega imediata via download apos confirmacao do pagamento.`,
      category_id: "services",
      quantity: 1,
      unit_price: formData.transaction_amount,
    }];

    const paymentBody: Record<string, unknown> = {
      transaction_amount: formData.transaction_amount,
      description: "Fotos profissionais - fotonatrip",
      payment_method_id: formData.payment_method_id,
      statement_descriptor: "FOTONATRIP",
      payer: {
        email: payerEmail || formData.payer?.email,
        identification: formData.payer?.identification,
      },
      external_reference: orderId,
      notification_url: `${appUrl}/api/webhook/mercadopago`,
      callback_url: `${appUrl}/checkout/sucesso?order=${orderId}`,
      additional_info: {
        items: mpItems,
      },
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
    console.error("Process payment error:", JSON.stringify(err, null, 2));

    // Extract detailed error from Mercado Pago SDK
    let message = "Erro ao processar pagamento";
    if (err && typeof err === "object") {
      const mpErr = err as Record<string, unknown>;
      // MP SDK errors have cause array with code/description
      if (Array.isArray(mpErr.cause) && mpErr.cause.length > 0) {
        const cause = mpErr.cause[0] as Record<string, unknown>;
        message = `${cause.description || cause.code || message}`;
        console.error("MP cause:", JSON.stringify(mpErr.cause));
      } else if (mpErr.message) {
        message = String(mpErr.message);
      }
    } else if (err instanceof Error) {
      message = err.message;
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
