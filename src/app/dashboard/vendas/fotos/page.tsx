"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/cart";
import { getPhotoUrl } from "@/lib/photos";
import { ArrowLeft, X, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const PHOTOS_PER_PAGE = 50;

export default function FotosVendidasPage() {
  return (
    <Suspense>
      <FotosVendidasContent />
    </Suspense>
  );
}

interface SoldPhoto {
  photo_id: string;
  watermark_path: string | null;
  storage_path: string;
  event_title: string;
  event_id: string;
  price_cents: number;
  sold_count: number;
  total_revenue_cents: number;
  last_sold_at: string;
}

function FotosVendidasContent() {
  const searchParams = useSearchParams();
  const eventoFilter = searchParams.get("evento");
  const [photos, setPhotos] = useState<SoldPhoto[]>([]);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<SoldPhoto | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const supabase = createClient();

  const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = useMemo(
    () => photos.slice((currentPage - 1) * PHOTOS_PER_PAGE, currentPage * PHOTOS_PER_PAGE),
    [photos, currentPage]
  );

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

    let query = supabase
      .from("order_items")
      .select(`
        photo_id, price_cents,
        orders!inner(status, created_at),
        photos!inner(storage_path, watermark_path, event_id, events(title))
      `)
      .eq("photographer_id", user.id)
      .eq("orders.status", "paid");

    if (eventoFilter) {
      query = query.eq("photos.event_id", eventoFilter);
    }

    const { data } = await query;

    if (!data || data.length === 0) {
      // If filtering by event, still get event title
      if (eventoFilter) {
        const { data: evt } = await supabase
          .from("events")
          .select("title")
          .eq("id", eventoFilter)
          .single();
        if (evt) setEventTitle(evt.title);
      }
      setLoading(false);
      return;
    }

    // Group by photo_id to count how many times each photo was sold
    const photoMap = new Map<string, SoldPhoto>();
    for (const item of data as any[]) {
      const pid = item.photo_id;
      const orderDate = item.orders?.created_at || "";
      const existing = photoMap.get(pid);
      if (existing) {
        existing.sold_count += 1;
        existing.total_revenue_cents += Math.round(item.price_cents * 0.93);
        if (orderDate > existing.last_sold_at) {
          existing.last_sold_at = orderDate;
        }
      } else {
        photoMap.set(pid, {
          photo_id: pid,
          watermark_path: item.photos?.watermark_path || null,
          storage_path: item.photos?.storage_path || "",
          event_title: item.photos?.events?.title || "Evento",
          event_id: item.photos?.event_id || "",
          price_cents: item.price_cents,
          sold_count: 1,
          total_revenue_cents: Math.round(item.price_cents * 0.93),
          last_sold_at: orderDate,
        });
      }
    }

    // Sort by most recent sale first
    const sorted = Array.from(photoMap.values()).sort(
      (a, b) => b.last_sold_at.localeCompare(a.last_sold_at)
    );

    setPhotos(sorted);
    if (eventoFilter && sorted.length > 0) {
      setEventTitle(sorted[0].event_title);
    }
    setLoading(false);
  }

  const backHref = eventoFilter
    ? `/dashboard/eventos/${eventoFilter}`
    : "/dashboard/vendas";
  const backLabel = eventoFilter
    ? "Voltar para evento"
    : "Voltar para vendas";
  const title = eventoFilter
    ? `Fotos vendidas${eventTitle ? ` - ${eventTitle}` : ""}`
    : "Fotos vendidas";

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
          href={backHref}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
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
            {eventoFilter
              ? "Nenhuma foto deste evento foi vendida ainda."
              : "Quando clientes comprarem suas fotos, elas aparecerao aqui."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginatedPhotos.map((photo) => {
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
                    {!eventoFilter && (
                      <p className="text-xs text-muted truncate mb-1">{photo.event_title}</p>
                    )}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={currentPage === 1}
                className="p-2 rounded-xl glass text-sm disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-muted">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl glass text-sm disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
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
