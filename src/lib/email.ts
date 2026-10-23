import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export async function notifySale(orderId: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("Email: RESEND_API_KEY not set, skipping notification");
      return;
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check if already notified (anti-duplicate)
    const { data: order } = await supabase
      .from("orders")
      .select("id, notified_at, created_at")
      .eq("id", orderId)
      .single();

    if (!order || order.notified_at) return;

    // Fetch order items with photographer and event info
    const { data: items } = await supabase
      .from("order_items")
      .select(`
        price_cents,
        photographer_id,
        photo_id,
        photos!inner(event_id, events!inner(title))
      `)
      .eq("order_id", orderId);

    if (!items || items.length === 0) return;

    // Group by photographer
    const byPhotographer = new Map<
      string,
      { totalCents: number; photoCount: number; events: Set<string> }
    >();

    for (const item of items) {
      const pid = item.photographer_id;
      const eventTitle =
        (item as unknown as { photos: { events: { title: string } } }).photos?.events?.title || "Evento";
      const existing = byPhotographer.get(pid) || {
        totalCents: 0,
        photoCount: 0,
        events: new Set<string>(),
      };
      existing.totalCents += item.price_cents;
      existing.photoCount += 1;
      existing.events.add(eventTitle);
      byPhotographer.set(pid, existing);
    }

    // Send email to each photographer
    for (const [photographerId, data] of byPhotographer) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", photographerId)
        .single();

      const { data: authUser } = await supabase.auth.admin.getUserById(photographerId);
      const email = authUser?.user?.email;
      if (!email) continue;

      const repasseCents = Math.round(data.totalCents * 0.93);
      const eventList = [...data.events].join(", ");
      const nome = profile?.full_name?.split(" ")[0] || "Fotógrafo";

      await resend.emails.send({
        from: "Fotonatrip <vendas@fotonatrip.com.br>",
        to: email,
        subject: "Nova venda no Fotonatrip!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0d9668; margin: 0; font-size: 24px;">Fotonatrip</h1>
            </div>
            <p style="font-size: 16px;">Olá, <strong>${nome}</strong>!</p>
            <p style="font-size: 16px;">Você acabou de realizar uma venda! 🎉</p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Evento:</strong> ${eventList}</p>
              <p style="margin: 8px 0;"><strong>Fotos vendidas:</strong> ${data.photoCount}</p>
              <p style="margin: 8px 0;"><strong>Valor total:</strong> ${formatCents(data.totalCents)}</p>
              <p style="margin: 8px 0; color: #0d9668; font-size: 18px;"><strong>Seu repasse: ${formatCents(repasseCents)}</strong></p>
            </div>
            <p style="font-size: 14px; color: #666;">
              O repasse será incluído no próximo lote de pagamento (toda sexta-feira, mínimo R$10,00).
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://www.fotonatrip.com.br/dashboard/vendas"
                 style="background: #0d9668; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Ver minhas vendas
              </a>
            </div>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              Fotonatrip — Suas fotos, sua história<br/>
              www.fotonatrip.com.br
            </p>
          </div>
        `,
      });
    }

    // Mark as notified
    await supabase
      .from("orders")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", orderId);

    console.log(`Email: notified sale for order ${orderId}`);
  } catch (err) {
    console.error("Email notification error:", err);
    // Never throw — email failure must not break payment flow
  }
}
