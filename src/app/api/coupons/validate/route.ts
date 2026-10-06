import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { code, total_cents } = await req.json();

    if (!code || !total_cents) {
      return NextResponse.json({ valid: false, message: "Dados incompletos" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: coupon } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .single();

    if (!coupon) {
      return NextResponse.json({ valid: false, message: "Cupom nao encontrado" });
    }

    if (!coupon.active) {
      return NextResponse.json({ valid: false, message: "Cupom inativo" });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, message: "Cupom expirado" });
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, message: "Cupom esgotado" });
    }

    if (coupon.min_order_cents && total_cents < coupon.min_order_cents) {
      const min = (coupon.min_order_cents / 100).toFixed(2).replace(".", ",");
      return NextResponse.json({
        valid: false,
        message: `Valor minimo do pedido: R$ ${min}`,
      });
    }

    // Calculate discount
    let discount_cents: number;
    if (coupon.discount_type === "percentage") {
      discount_cents = Math.round(total_cents * (coupon.discount_value / 100));
    } else {
      discount_cents = coupon.discount_value;
    }

    // Discount cannot exceed total
    discount_cents = Math.min(discount_cents, total_cents);

    const label =
      coupon.discount_type === "percentage"
        ? `${coupon.discount_value}% de desconto`
        : `R$ ${(coupon.discount_value / 100).toFixed(2).replace(".", ",")} de desconto`;

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_cents,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      label,
    });
  } catch {
    return NextResponse.json({ valid: false, message: "Erro ao validar cupom" });
  }
}
