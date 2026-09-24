"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEmbeddingFromFile } from "@/lib/face-recognition";
import { getPhotoUrl } from "@/lib/photos";
import {
  ScanFace,
  ArrowLeft,
  ImageIcon,
  Loader2,
  ShoppingCart,
  Check,
  CalendarDays,
  MapPin,
  Search,
  Package,
  Camera,
  Image as ImageLucide,
  X,
  ZoomIn,
} from "lucide-react";
import { useCart, formatPrice, type CartItem } from "@/lib/cart";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";

export default function BuscarPage() {
  return (
    <Suspense>
      <BuscarContent />
    </Suspense>
  );
}

interface EventOption {
  id: string;
  title: string;
  location: string | null;
  city: string | null;
  state: string | null;
  event_date: string | null;
  photo_count: number;
  cover_url: string | null;
}

interface SearchResult {
  photo_id: string;
  similarity: number;
  storage_path: string;
  watermark_path: string | null;
  event_id: string;
  event_title: string;
  photographer_name: string;
  price_cents: number;
  package_price_cents: number | null;
}

function BuscarContent() {
  const searchParams = useSearchParams();
  const eventoParam = searchParams.get("evento");

  const [events, setEvents] = useState<EventOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventSearch, setEventSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);

  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [noFace, setNoFace] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<SearchResult | null>(null);

  // Handle Android back button for preview lightbox
  useEffect(() => {
    if (!previewPhoto) return;
    window.history.pushState({ preview: true }, "");
    const onPopState = () => setPreviewPhoto(null);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [previewPhoto]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { addItem, addPackage, isInCart, isPackageInCart } = useCart();
  const supabase = createClient();

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoadingEvents(true);
    const { data } = await supabase
      .from("events")
      .select("id, title, location, city, state, event_date, photo_count, cover_url")
      .eq("status", "active")
      .order("event_date", { ascending: false, nullsFirst: false });

    const eventList = data || [];
    setEvents(eventList);

    if (eventoParam) {
      const found = eventList.find((e) => e.id === eventoParam);
      if (found) setSelectedEvent(found);
    }

    setLoadingEvents(false);
  }

  const filteredEvents = eventSearch
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
          e.location?.toLowerCase().includes(eventSearch.toLowerCase()) ||
          e.city?.toLowerCase().includes(eventSearch.toLowerCase())
      )
    : events;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfie(URL.createObjectURL(file));
    setSearched(false);
    setNoFace(false);
    setResults([]);
  }

  async function handleSearch() {
    if (!selfieFile || !selectedEvent) return;
    setSearching(true);
    setLoadingModels(true);
    setNoFace(false);

    const embedding = await getEmbeddingFromFile(selfieFile);
    setLoadingModels(false);

    if (!embedding) {
      setNoFace(true);
      setSearching(false);
      return;
    }

    const embeddingStr = `[${embedding.join(",")}]`;
    const { data, error } = await supabase.rpc("search_faces_by_embedding", {
      query_embedding: embeddingStr,
      similarity_threshold: 0.4,
      max_results: 50,
      filter_event_id: selectedEvent.id,
    });

    if (error) {
      console.error("Search error:", error.message, error.details, error.hint);
    }

    setResults(data || []);
    setSearching(false);
    setSearched(true);
  }

  function reset() {
    if (selfie) URL.revokeObjectURL(selfie);
    setSelfie(null);
    setSelfieFile(null);
    setSearched(false);
    setResults([]);
    setNoFace(false);
  }

  function resetAll() {
    reset();
    setSelectedEvent(null);
  }

  return (
    <div className="min-h-screen">
      <Header />

      <div className="pt-24 pb-24 px-6 max-w-4xl mx-auto">
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative">
          <Link
            href={selectedEvent && !searched ? `/eventos/${selectedEvent.id}` : "/"}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <ScanFace className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Encontre suas fotos
            </h1>
            <p className="text-muted max-w-md mx-auto">
              {!selectedEvent
                ? "Selecione o evento para buscar suas fotos."
                : !selfie
                ? "Envie uma selfie e nossa IA vai encontrar suas fotos neste evento."
                : ""}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedEvent ? "bg-primary text-white" : "bg-primary/10 text-primary"
            }`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
              Evento
            </div>
            <div className="w-8 h-px bg-border" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedEvent && !searched ? "bg-primary text-white" : selectedEvent ? "bg-primary/10 text-primary" : "bg-white/5 text-muted"
            }`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
              Selfie
            </div>
            <div className="w-8 h-px bg-border" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              searched ? "bg-primary text-white" : "bg-white/5 text-muted"
            }`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">3</span>
              Fotos
            </div>
          </div>

          {/* STEP 1: Event Selection */}
          {!selectedEvent ? (
            <div>
              <div className="relative max-w-lg mx-auto mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Buscar por evento, local ou cidade..."
                  className="w-full bg-white/5 border border-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
                />
              </div>

              {loadingEvents ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarDays className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                  <p className="text-muted">Nenhum evento encontrado.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {filteredEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="group glass rounded-2xl overflow-hidden text-left hover:-translate-y-1 hover:border-primary/50 transition-all duration-300"
                    >
                      <div className="aspect-[16/9] bg-surface-light relative overflow-hidden">
                        {event.cover_url ? (
                          <img
                            src={event.cover_url}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-transparent">
                            <ImageIcon className="w-10 h-10 text-muted/20" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3 text-white" />
                          <span className="text-xs text-white font-medium">{event.photo_count}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-1.5 group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                          {(event.location || event.city) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {event.location || event.city}
                              {event.state && ` - ${event.state}`}
                            </span>
                          )}
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {new Date(event.event_date + "T00:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : !selfie ? (
            <div>
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-muted">Evento:</span>
                  <span className="font-medium">{selectedEvent.title}</span>
                  <button onClick={resetAll} className="ml-1 text-muted hover:text-foreground transition-colors text-xs" title="Trocar evento">(trocar)</button>
                </div>
              </div>

              <div className="glass rounded-3xl border-2 border-dashed border-border max-w-lg mx-auto">
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <ScanFace className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-medium mb-2">Envie uma selfie</p>
                  <p className="text-sm text-muted mb-8">Tire uma foto ou escolha da galeria</p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl font-medium transition-colors"
                    >
                      <Camera className="w-5 h-5" />
                      Tirar foto
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 glass hover:bg-white/10 px-5 py-3 rounded-xl font-medium transition-colors border border-border"
                    >
                      <ImageLucide className="w-5 h-5" />
                      Galeria
                    </button>
                  </div>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handleFileSelect} className="hidden" />
                  <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                  <div className="flex flex-col items-center gap-2 mt-6 pt-6 border-t border-border w-full max-w-xs">
                    <Link
                      href={`/eventos/${selectedEvent.id}`}
                      className="text-xs text-muted hover:text-foreground transition-colors"
                    >
                      Ver todas as fotos do evento
                    </Link>
                    <Link
                      href={`/eventos/${selectedEvent.id}?tab=sem-rosto`}
                      className="text-xs text-muted hover:text-primary transition-colors"
                    >
                      Ver fotos sem rosto identificado
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : !searched ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-muted">Evento:</span>
                  <span className="font-medium">{selectedEvent.title}</span>
                </div>
              </div>

              <div className="w-48 h-48 rounded-full overflow-hidden mx-auto mb-8 border-4 border-primary/20 glow-green">
                <img src={selfie} alt="Sua selfie" className="w-full h-full object-cover" />
              </div>

              {noFace && (
                <div className="glass rounded-xl p-4 mb-6 max-w-md mx-auto">
                  <p className="text-sm text-red-400">
                    Nao conseguimos detectar um rosto na foto. Tente outra selfie com o rosto bem visivel.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={handleSearch} disabled={searching} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50 glow-green">
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {loadingModels ? "Analisando rosto..." : "Buscando..."}
                    </>
                  ) : (
                    <>
                      <ScanFace className="w-5 h-5" />
                      Buscar minhas fotos
                    </>
                  )}
                </button>
                <button onClick={reset} disabled={searching} className="flex items-center justify-center gap-2 glass hover:bg-white/10 px-8 py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50">
                  Trocar foto
                </button>
              </div>

              {searching && (
                <p className="text-sm text-muted mt-6 animate-pulse">
                  {loadingModels
                    ? "Analisando seu rosto com IA..."
                    : `Comparando seu rosto com as fotos do evento "${selectedEvent.title}"...`}
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-muted">Evento:</span>
                  <span className="font-medium">{selectedEvent.title}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    {results.length > 0
                      ? `${results.length} foto${results.length !== 1 ? "s" : ""} encontrada${results.length !== 1 ? "s" : ""}`
                      : "Nenhuma foto encontrada"}
                  </h2>
                  {results.length > 0 && (
                    <p className="text-sm text-muted mt-1">Mostrando as fotos com maior similaridade.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={reset} className="text-sm text-primary hover:text-primary-light transition-colors font-medium">Nova selfie</button>
                  <span className="text-border">|</span>
                  <button onClick={resetAll} className="text-sm text-primary hover:text-primary-light transition-colors font-medium">Outro evento</button>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="glass rounded-3xl p-10 text-center">
                  <ImageIcon className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                  <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
                    Nao encontramos fotos suas neste evento. Tente com outra selfie ou verifique se selecionou o evento correto.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={reset} className="text-sm text-primary hover:text-primary-light transition-colors font-medium">Tentar outra selfie</button>
                    <button onClick={resetAll} className="text-sm text-primary hover:text-primary-light transition-colors font-medium">Trocar evento</button>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border">
                    <Link
                      href={`/eventos/${selectedEvent.id}`}
                      className="text-sm text-muted hover:text-primary transition-colors"
                    >
                      Ver todas as fotos do evento, incluindo fotos sem rosto identificado
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                {/* Package banner */}
                {results[0]?.package_price_cents && selectedEvent && (
                  <div className="glass rounded-2xl p-5 mb-6 border border-primary/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            Pacote com todas as {results.length} fotos
                          </p>
                          <p className="text-xs text-muted">
                            De {formatPrice(results.reduce((s, r) => s + r.price_cents, 0))} por apenas{" "}
                            <span className="text-primary font-semibold">{formatPrice(results[0].package_price_cents!)}</span>
                          </p>
                        </div>
                      </div>
                      {isPackageInCart(selectedEvent.id) ? (
                        <span className="flex items-center justify-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-xl text-sm font-medium">
                          <Check className="w-4 h-4" />
                          Pacote no carrinho
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const firstUrl = getPhotoUrl(results[0].watermark_path || results[0].storage_path);
                            addPackage({
                              photo_id: `pkg_${selectedEvent.id}`,
                              event_id: selectedEvent.id,
                              event_title: selectedEvent.title,
                              photographer_name: results[0].photographer_name,
                              photographer_id: "",
                              price_cents: results[0].package_price_cents!,
                              watermark_url: firstUrl,
                              is_package: true,
                              package_photo_ids: results.map((r) => r.photo_id),
                              package_photo_count: results.length,
                            });
                          }}
                          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors glow-green whitespace-nowrap"
                        >
                          <Package className="w-4 h-4" />
                          Comprar pacote
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {results.map((result) => {
                    const displayPath = result.watermark_path || result.storage_path;
                    const url = getPhotoUrl(displayPath);

                    return (
                      <div key={result.photo_id} className="group glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-all">
                        <div
                          className="aspect-[3/4] overflow-hidden relative cursor-pointer"
                          onClick={() => setPreviewPhoto(result)}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          <span className="absolute top-2 right-2 text-[10px] text-primary bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            {Math.round(70 + ((Math.min(result.similarity, 0.8) - 0.4) / 0.4) * 30)}% match
                          </span>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity md:flex hidden">
                            <ZoomIn className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-muted truncate mb-2">{result.event_title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{formatPrice(result.price_cents)}</span>
                            {isInCart(result.photo_id) ? (
                              <span className="flex items-center gap-1 text-[11px] text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                                <Check className="w-3 h-3" />
                                No carrinho
                              </span>
                            ) : (
                              <button
                                onClick={() => addItem({
                                  photo_id: result.photo_id,
                                  event_id: result.event_id,
                                  event_title: result.event_title,
                                  photographer_name: result.photographer_name,
                                  photographer_id: "",
                                  price_cents: result.price_cents,
                                  watermark_url: url,
                                })}
                                className="flex items-center gap-1 text-[11px] text-foreground bg-white/10 hover:bg-primary hover:text-white px-2.5 py-1 rounded-full transition-colors"
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

                <div className="mt-8 glass rounded-xl p-4 text-center space-y-2">
                  <Link
                    href={`/eventos/${selectedEvent.id}`}
                    className="block text-sm text-muted hover:text-primary transition-colors"
                  >
                    Ver todas as fotos do evento
                  </Link>
                  <Link
                    href={`/eventos/${selectedEvent.id}?tab=sem-rosto`}
                    className="block text-sm text-primary hover:text-primary-dark transition-colors font-medium"
                  >
                    Ver fotos sem rosto identificado
                  </Link>
                </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo preview lightbox */}
      {previewPhoto && (() => {
        const previewUrl = getPhotoUrl(previewPhoto.watermark_path || previewPhoto.storage_path);
        const closePreview = () => {
          setPreviewPhoto(null);
          if (window.history.state?.preview) window.history.back();
        };
        return (
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closePreview}
          >
            <button
              onClick={closePreview}
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
              <div className="mt-4 flex items-center justify-between glass rounded-xl p-3">
                <div>
                  <p className="text-xs text-muted">{previewPhoto.event_title}</p>
                  <p className="text-sm font-semibold">{formatPrice(previewPhoto.price_cents)}</p>
                </div>
                {isInCart(previewPhoto.photo_id) ? (
                  <span className="flex items-center gap-1.5 text-sm text-primary bg-primary/10 px-4 py-2 rounded-xl">
                    <Check className="w-4 h-4" />
                    No carrinho
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      addItem({
                        photo_id: previewPhoto.photo_id,
                        event_id: previewPhoto.event_id,
                        event_title: previewPhoto.event_title,
                        photographer_name: previewPhoto.photographer_name,
                        photographer_id: "",
                        price_cents: previewPhoto.price_cents,
                        watermark_url: previewUrl,
                      });
                    }}
                    className="flex items-center gap-1.5 text-sm bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Adicionar
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
