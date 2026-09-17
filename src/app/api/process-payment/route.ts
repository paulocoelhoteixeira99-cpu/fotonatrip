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

    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });

    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: formData.transaction_amount,
        token: formData.token,
        description: "Fotos profissionais - fotonatrip",
        installments: formData.installments,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        payer: {
          email: formData.payer?.email,
          identification: formData.payer?.identification,
        },
        external_reference: orderId,
      },
    });

    // Update order with payment info
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

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

    return NextResponse.json({
      status: result.status,
      status_detail: result.status_detail,
      payment_id: result.id,
    });
  } catch (err: unknown) {
    console.error("Process payment error:", err);
    const message = err instanceof Error ? err.message : "Erro ao processar pagamento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
