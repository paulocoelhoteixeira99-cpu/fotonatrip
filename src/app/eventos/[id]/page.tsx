"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ImageIcon,
  ScanFace,
  ChevronLeft,
  ChevronRight,
  X,
  ShoppingCart,
  Check,
  User,
} from "lucide-react";
import { useCart, formatPrice } from "@/lib/cart";

interface Event {
  id: string;
  photographer_id: string;
  title: string;
  description: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  event_date: string | null;
  photo_count: number;
}

interface Photo {
  id: string;
  storage_path: string;
  watermark_path: string | null;
  price_cents: number;
  status: string;
}

interface Photographer {
  full_name: string;
  business_name: string | null;
}

const PHOTOS_PER_PAGE = 20;

export default function EventoPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const { addItem, isInCart } = useCart();
  const supabase = createClient();

  useEffect(() => {
    loadEvent();
  }, [id]);

  useEffect(() => {
    if (event) loadPhotos();
  }, [event, page]);

  async function loadEvent() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (data) {
      setEvent(data);

      // Load photographer info
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.photographer_id)
        .single();

      const { data: photographerData } = await supabase
        .from("photographers")
        .select("business_name")
        .eq("id", data.photographer_id)
        .single();

      if (profileData) {
        setPhotographer({
          full_name: profileData.full_name,
          business_name: photographerData?.business_name || null,
        });
      }
    }

    setLoading(false);
  }

  async function loadPhotos() {
    const { data, count } = await supabase
      .from("photos")
      .select("id, storage_path, watermark_path, price_cents, status", { count: "exact" })
      .eq("event_id", id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .range(page * PHOTOS_PER_PAGE, (page + 1) * PHOTOS_PER_PAGE - 1);

    setPhotos(data || []);
    setTotalPhotos(count || 0);
  }

  // Keyboard nav for lightbox
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!selectedPhoto) return;
      if (e.key === "Escape") setSelectedPhoto(null);
      if (e.key === "ArrowRight") {
        const idx = photos.findIndex((p) => p.id === selectedPhoto.id);
        if (idx < photos.length - 1) setSelectedPhoto(photos[idx + 1]);
      }
      if (e.key === "ArrowLeft") {
        const idx = photos.findIndex((p) => p.id === selectedPhoto.id);
        if (idx > 0) setSelectedPhoto(photos[idx - 1]);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedPhoto, photos]);

  const totalPages = Math.ceil(totalPhotos / PHOTOS_PER_PAGE);

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted text-lg mb-4">Evento nao encontrado.</p>
            <Link
              href="/eventos"
              className="text-primary hover:text-primary-light transition-colors"
            >
              Ver todos os eventos
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Back */}
          <Link
            href="/eventos"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Todos os eventos
          </Link>

          {/* Event header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                {photographer && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {photographer.business_name || photographer.full_name}
                  </span>
                )}
                {(event.location || event.city) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {event.location || event.city}
                    {event.state && ` - ${event.state}`}
                  </span>
                )}
                {event.event_date && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    {new Date(
                      event.event_date + "T00:00:00"
                    ).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  {totalPhotos} fotos
                </span>
              </div>
              {event.description && (
                <p className="text-muted mt-4 max-w-2xl">{event.description}</p>
              )}
            </div>

            <Link
              href="/buscar"
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-medium transition-colors glow-green hover:scale-105 whitespace-nowrap w-fit"
            >
              <ScanFace className="w-5 h-5" />
              Encontrar minhas fotos
            </Link>
          </div>

          {/* Photos grid */}
          {photos.length === 0 ? (
            <div className="text-center py-20">
              <ImageIcon className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-muted">Nenhuma foto disponivel neste evento.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {photos.map((photo) => {
                  const displayPath = photo.watermark_path || photo.storage_path;
                  const url = supabase.storage
                    .from("photos")
                    .getPublicUrl(displayPath).data.publicUrl;

                  return (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-light border border-border cursor-pointer"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <span className="text-white text-sm font-medium">
                            {formatPrice(photo.price_cents)}
                          </span>
                          {isInCart(photo.id) ? (
                            <span className="flex items-center gap-1 text-[11px] text-primary bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                              <Check className="w-3 h-3" />
                              No carrinho
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const photographerName = photographer?.business_name || photographer?.full_name || "";
                                addItem({
                                  photo_id: photo.id,
                                  event_id: event!.id,
                                  event_title: event!.title,
                                  photographer_name: photographerName,
                                  photographer_id: event!.photographer_id,
                                  price_cents: photo.price_cents,
                                  watermark_url: url,
                                });
                              }}
                              className="flex items-center gap-1 text-[11px] text-white bg-primary/80 hover:bg-primary px-2 py-1 rounded-full transition-colors"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              Adicionar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => {
                      setPage((p) => Math.max(0, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={page === 0}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm glass hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 7) {
                        pageNum = i;
                      } else if (page < 3) {
                        pageNum = i;
                      } else if (page > totalPages - 4) {
                        pageNum = totalPages - 7 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setPage(pageNum);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                            pageNum === page
                              ? "bg-primary text-white"
                              : "glass hover:bg-white/10 text-muted"
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setPage((p) => Math.min(totalPages - 1, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm glass hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Proximo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image (watermarked) */}
            <img
              src={
                supabase.storage
                  .from("photos")
                  .getPublicUrl(selectedPhoto.watermark_path || selectedPhoto.storage_path).data.publicUrl
              }
              alt=""
              className="max-h-[80vh] w-auto rounded-xl select-none pointer-events-none"
            />

            {/* Info bar */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-white">
                <span className="text-lg font-semibold">
                  {formatPrice(selectedPhoto.price_cents)}
                </span>
                <span className="text-white/50 text-sm ml-3">
                  {event.title}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isInCart(selectedPhoto.id) ? (
                  <span className="flex items-center gap-2 bg-primary/20 text-primary px-5 py-2.5 rounded-xl text-sm font-medium">
                    <Check className="w-4 h-4" />
                    No carrinho
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const photographerName = photographer?.business_name || photographer?.full_name || "";
                      const photoUrl = supabase.storage
                        .from("photos")
                        .getPublicUrl(selectedPhoto.watermark_path || selectedPhoto.storage_path).data.publicUrl;
                      addItem({
                        photo_id: selectedPhoto.id,
                        event_id: event.id,
                        event_title: event.title,
                        photographer_name: photographerName,
                        photographer_id: event.photographer_id,
                        price_cents: selectedPhoto.price_cents,
                        watermark_url: photoUrl,
                      });
                    }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Adicionar ao carrinho
                  </button>
                )}
              </div>
            </div>

            {/* Navigation arrows */}
            {photos.findIndex((p) => p.id === selectedPhoto.id) > 0 && (
              <button
                onClick={() => {
                  const idx = photos.findIndex(
                    (p) => p.id === selectedPhoto.id
                  );
                  setSelectedPhoto(photos[idx - 1]);
                }}
                className="absolute left-[-60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {photos.findIndex((p) => p.id === selectedPhoto.id) <
              photos.length - 1 && (
              <button
                onClick={() => {
                  const idx = photos.findIndex(
                    (p) => p.id === selectedPhoto.id
                  );
                  setSelectedPhoto(photos[idx + 1]);
                }}
                className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
