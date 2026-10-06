import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const BOT_PATTERNS = /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|bingpreview|linkedinbot|twitterbot|whatsapp|telegram|googlebot/i;

export async function POST(req: Request) {
  try {
    const { path, event_id, user_agent, referrer, session_id } = await req.json();

    if (!path || !session_id) {
      return NextResponse.json({ ok: true });
    }

    // Filter bots
    if (user_agent && BOT_PATTERNS.test(user_agent)) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from("page_views").insert({
      path,
      event_id: event_id || null,
      user_agent: user_agent || null,
      referrer: referrer || null,
      session_id,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
