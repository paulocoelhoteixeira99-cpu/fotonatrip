import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "";

export async function GET(request: NextRequest) {
  const photoId = request.nextUrl.searchParams.get("photo_id");
  if (!photoId) {
    return NextResponse.json({ error: "photo_id required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the photo with event info
  const { data: photo } = await supabase
    .from("photos")
    .select("storage_path, original_filename, photographer_id, event_id, events!inner(photographer_id)")
    .eq("id", photoId)
    .single();

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Allow if user is the photographer who uploaded OR the event owner
  const isPhotographer = photo.photographer_id === user.id;
  const eventData = photo.events as unknown as { photographer_id: string };
  const isEventOwner = eventData.photographer_id === user.id;

  let orderItem: { id: string } | null = null;

  if (!isPhotographer && !isEventOwner) {
    // Otherwise, verify user has a paid order containing this photo
    const { data: item } = await supabase
      .from("order_items")
      .select("id, photo_id, orders!inner(id, client_id, status)")
      .eq("photo_id", photoId)
      .eq("orders.client_id", user.id)
      .eq("orders.status", "paid")
      .limit(1)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    orderItem = item;
  }

  // Fetch original from CDN (server-side, no CORS issues)
  const photoUrl = `${CDN_URL}/${photo.storage_path}`;
  const res = await fetch(photoUrl);

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 502 });
  }

  const blob = await res.blob();
  const filename = photo.original_filename || `fotonatrip-${photoId.slice(0, 8)}.jpg`;

  // Track download (only for client purchases)
  if (orderItem) {
    await supabase
      .from("order_items")
      .update({ downloaded_at: new Date().toISOString() })
      .eq("id", orderItem.id);
  }

  return new NextResponse(blob, {
    headers: {
      "Content-Type": blob.type || "image/jpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
