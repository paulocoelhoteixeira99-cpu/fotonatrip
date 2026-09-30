"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/cart";
import { getPhotoUrl } from "@/lib/photos";
import { ArrowLeft, ImageIcon, X, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface SoldPhoto {
  photo_id: string;
  watermark_path: string | null;
  storage_path: string;
  event_title: string;
  price_cents: number;
  sold_count: number;
  total_revenue_cents: number;
}

export default function FotosVendidasPage() {
  const [photos, setPhotos] = useState<SoldPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<SoldPhoto | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadSoldPhotos();
  }, []);

  // Browser back button closes lightbox
  useEffect(() => {
    if (!previewPhoto) return;
    window.history.pushState({ preview: true }, "");
    const onPopState = () => {
      if (previewPhoto) setPreviewPhoto(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [previewPhoto]);

  async function loadSoldPhotos() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("order_items")
      .select(`
        photo_id, price_cents,
        orders!inner(status),
        photos!inner(storage_path, watermark_path, events(title))
      `)
      .eq("photographer_id", user.id)
      .eq("orders.status", "paid");

    if (!data || data.length === 0) {
      setLoading(false);
      return;
    }

    // Group by photo_id to count how many times each photo was sold
    const photoMap = new Map<string, SoldPhoto>();
    for (const item of data as any[]) {
      const pid = item.photo_id;
      const existing = photoMap.get(pid);
      if (existing) {
        existing.sold_count += 1;
        existing.total_revenue_cents += Math.round(item.price_cents * 0.93);
      } else {
        photoMap.set(pid, {
          photo_id: pid,
          watermark_path: item.photos?.watermark_path || null,
          storage_path: item.photos?.storage_path || "",
          event_title: item.photos?.events?.title || "Evento",
          price_cents: item.price_cents,
          sold_count: 1,
          total_revenue_cents: Math.round(item.price_cents * 0.93),
        });
      }
    }

    // Sort by sold_count desc, then by revenue desc
    const sorted = Array.from(photoMap.values()).sort(
      (a, b) => b.sold_count - a.sold_count || b.total_revenue_cents - a.total_revenue_cents
    );

    setPhotos(sorted);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/vendas"
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para vendas
        </Link>
        <h1 className="text-2xl font-bold">Fotos vendidas</h1>
        <p className="text-muted text-sm mt-1">
          {photos.length > 0
            ? `${photos.length} foto${photos.length !== 1 ? "s" : ""} diferente${photos.length !== 1 ? "s" : ""} vendida${photos.length !== 1 ? "s" : ""}`
            : "Nenhuma foto vendida ainda."}
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <ShoppingBag className="w-12 h-12 text-muted/20 mx-auto mb-4" />
          <p className="text-muted text-sm">
            Quando clientes comprarem suas fotos, elas aparecerao aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {photos.map((photo) => {
            const url = getPhotoUrl(photo.storage_path);
            return (
              <div
                key={photo.photo_id}
                className="group glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-all"
              >
                <div
                  className="aspect-[3/4] overflow-hidden relative cursor-pointer"
                  onClick={() => setPreviewPhoto(photo)}
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {photo.sold_count > 1 && (
                    <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {photo.sold_count}x vendida
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted truncate mb-1">{photo.event_title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      {formatPrice(photo.total_revenue_cents)}
                    </span>
                    <span className="text-[10px] text-muted">
                      {photo.sold_count}x
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo preview lightbox */}
      {previewPhoto && (() => {
        const previewUrl = getPhotoUrl(previewPhoto.storage_path);
        const closePreview = () => {
          if (window.history.state?.preview) {
            window.history.back();
          } else {
            setPreviewPhoto(null);
          }
        };
        return (
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closePreview}
          >
            <button
              onClick={(e) => { e.stopPropagation(); closePreview(); }}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewUrl}
                alt=""
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
              <div className="mt-4 glass rounded-xl p-3">
                <p className="text-xs text-muted">{previewPhoto.event_title}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-semibold text-primary">
                    Receita: {formatPrice(previewPhoto.total_revenue_cents)}
                  </p>
                  <span className="text-xs text-muted">
                    Vendida {previewPhoto.sold_count} vez{previewPhoto.sold_count !== 1 ? "es" : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
