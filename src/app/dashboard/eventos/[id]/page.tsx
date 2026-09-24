"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { processPhoto } from "@/lib/face-recognition";
import { getPhotoUrl, deletePhotoFiles } from "@/lib/photos";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  CalendarDays,
  MapPin,
  ImageIcon,
  Trash2,
  ScanFace,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Link2,
  Copy,
  Check,
  QrCode,
  Download,
  CalendarClock,
  Package,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  event_date: string | null;
  photo_count: number;
  status: string;
  scheduled_at: string | null;
  cover_url: string | null;
  price_per_photo_cents: number;
  package_price_cents: number | null;
}

interface Photo {
  id: string;
  thumbnail_path: string | null;
  watermark_path: string | null;
  storage_path: string;
  original_filename: string | null;
  status: string;
  created_at: string;
}

export default function EventoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [packagePriceInput, setPackagePriceInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSaved, setPriceSaved] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (!eventData) {
        router.push("/dashboard/eventos");
        return;
      }

      setEvent(eventData);
      setPriceInput((eventData.price_per_photo_cents / 100).toFixed(2).replace(".", ","));
      if (eventData.package_price_cents) {
        setPackagePriceInput((eventData.package_price_cents / 100).toFixed(2).replace(".", ","));
      }
      if (eventData.scheduled_at) {
        setScheduledAt(eventData.scheduled_at.slice(0, 16));
      }

      const { data: photosData } = await supabase
        .from("photos")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      setPhotos(photosData || []);
      setLoading(false);
    }

    load();
  }, [id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !event) return;

    const fileList = Array.from(files);
    setUploading(true);
    setUploadProgress({ done: 0, total: fileList.length });

    const abort = new AbortController();
    abortRef.current = abort;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let doneCount = 0;
    const CONCURRENT = 3;

    async function uploadOne(file: File) {
      if (abort.signal.aborted) return;

      const result = await processPhoto(file, user!.id, event!.id, abort.signal);

      if (!result) {
        doneCount++;
        setUploadProgress({ done: doneCount, total: fileList.length });
        return;
      }

      const { data: photoData } = await supabase
        .from("photos")
        .insert({
          event_id: event!.id,
          photographer_id: user!.id,
          storage_path: result.original_path,
          watermark_path: result.watermark_path,
          original_filename: file.name,
          file_size: result.file_size,
          status: "ready",
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (photoData && result.embeddings.length > 0) {
        const rows = result.embeddings.map((face) => ({
          photo_id: photoData.id,
          embedding: `[${face.embedding.join(",")}]`,
          bbox_x: face.bbox[0],
          bbox_y: face.bbox[1],
          bbox_w: face.bbox[2] - face.bbox[0],
          bbox_h: face.bbox[3] - face.bbox[1],
        }));
        await supabase.from("face_embeddings").insert(rows);
      }

      doneCount++;
      setUploadProgress({ done: doneCount, total: fileList.length });
    }

    // Process in parallel with concurrency limit
    const queue = [...fileList];
    const workers = Array.from({ length: CONCURRENT }, async () => {
      while (queue.length > 0 && !abort.signal.aborted) {
        const file = queue.shift()!;
        try {
          await uploadOne(file);
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Upload error:", err);
          }
          doneCount++;
          setUploadProgress({ done: doneCount, total: fileList.length });
        }
      }
    });

    await Promise.all(workers);
    abortRef.current = null;

    // Reload photos
    const { data: photosData } = await supabase
      .from("photos")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    setPhotos(photosData || []);
    setUploading(false);
    e.target.value = "";
  }

  function cancelUpload() {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
  }

  async function handleSetCover(storagePath: string) {
    if (!event) return;
    const url = getPhotoUrl(storagePath);
    await supabase.from("events").update({ cover_url: url }).eq("id", event.id);
    setEvent({ ...event, cover_url: url });
  }

  async function handleDeletePhoto(photoId: string) {
    const photo = photos.find((p) => p.id === photoId);
    await supabase.from("face_embeddings").delete().eq("photo_id", photoId);
    await supabase.from("photos").delete().eq("id", photoId);
    if (photo) {
      const paths = [photo.storage_path];
      if (photo.watermark_path) paths.push(photo.watermark_path);
      deletePhotoFiles(paths);
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  const [hasSoldPhotos, setHasSoldPhotos] = useState<boolean | null>(null);

  async function checkSoldPhotos() {
    if (!event) return false;
    const { count } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .in("photo_id", photos.map((p) => p.id));
    const hasSales = (count || 0) > 0;
    setHasSoldPhotos(hasSales);
    return hasSales;
  }

  async function handleDeleteEvent() {
    if (!event) return;

    // Check for sold photos before deleting
    const hasSales = await checkSoldPhotos();
    if (hasSales) return;

    setDeleting(true);

    const { data: allPhotos } = await supabase
      .from("photos")
      .select("id, storage_path, watermark_path")
      .eq("event_id", event.id);

    if (allPhotos && allPhotos.length > 0) {
      const paths: string[] = [];
      for (const photo of allPhotos) {
        paths.push(photo.storage_path);
        if (photo.watermark_path) paths.push(photo.watermark_path);
      }

      for (const photo of allPhotos) {
        await supabase.from("face_embeddings").delete().eq("photo_id", photo.id);
        await supabase.from("photos").delete().eq("id", photo.id);
      }

      deletePhotoFiles(paths);
    }

    await supabase.from("events").delete().eq("id", event.id);
    router.push("/dashboard/eventos");
  }

  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessStatus, setReprocessStatus] = useState("");

  async function handleReprocessAll() {
    setReprocessing(true);
    setReprocessStatus("Reprocessando rostos via IA...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !event) {
        setReprocessStatus("Erro: usuario nao autenticado.");
        setReprocessing(false);
        return;
      }

      let totalFaces = 0;
      let errors = 0;
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        setReprocessStatus(`Processando foto ${i + 1} de ${photos.length}...`);

        try {
          // Delete existing embeddings
          await supabase.from("face_embeddings").delete().eq("photo_id", photo.id);

          // Download photo from CDN and re-extract embeddings
          const photoUrl = getPhotoUrl(photo.storage_path);
          const res = await fetch(photoUrl);
          if (!res.ok) {
            errors++;
            continue;
          }
          const blob = await res.blob();
          const file = new File([blob], "photo.jpg", { type: blob.type });

          const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
          const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
          const formData = new FormData();
          formData.append("file", file);

          const extractRes = await fetch(`${API_URL}/extract-embedding`, {
            method: "POST",
            headers: { Authorization: `Bearer ${API_KEY}` },
            body: formData,
          });

          if (extractRes.ok) {
            const data = await extractRes.json();
            // Insert all detected face embeddings (not just the largest)
            const embeddings = data.embeddings || (data.embedding ? [{ embedding: data.embedding }] : []);
            for (const face of embeddings) {
              const embedding = `[${face.embedding.join(",")}]`;
              await supabase.from("face_embeddings").insert({
                photo_id: photo.id,
                embedding,
              });
              totalFaces++;
            }
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
      }

      const errorMsg = errors > 0 ? ` (${errors} erro(s))` : "";
      setReprocessStatus(`Concluido! ${totalFaces} rosto(s) detectado(s) em ${photos.length} fotos.${errorMsg}`);
    } catch (err) {
      console.error("Reprocess error:", err);
      setReprocessStatus("Erro ao reprocessar. Tente novamente.");
    } finally {
      setReprocessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div>
      <Link
        href="/dashboard/eventos"
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para eventos
      </Link>

      {/* Event header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted">
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {event.location}
                {event.city && `, ${event.city}`}
                {event.state && ` - ${event.state}`}
              </span>
            )}
            {event.event_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {new Date(event.event_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <ImageIcon className="w-4 h-4" />
              {photos.length} fotos
            </span>
          </div>
          {event.description && (
            <p className="text-sm text-muted mt-3">{event.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setHasSoldPhotos(null); checkSoldPhotos(); setShowDeleteConfirm(true); }}
            className="flex items-center gap-2 text-sm text-muted hover:text-red-400 hover:bg-red-400/10 px-4 py-2.5 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
          {photos.length > 0 && (
            <button
              onClick={handleReprocessAll}
              disabled={reprocessing}
              className="flex items-center gap-2 text-sm text-muted hover:text-primary hover:bg-primary/10 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              <ScanFace className="w-4 h-4" />
              {reprocessing ? "Processando..." : "Reprocessar rostos"}
            </button>
          )}
          <label className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4" />
          )}
          {uploading ? "Processando..." : "Enviar fotos"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full">
            <div className="w-12 h-12 rounded-xl bg-red-400/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">
              Excluir evento?
            </h3>
            {hasSoldPhotos ? (
              <>
                <p className="text-sm text-muted text-center mb-6">
                  Este evento possui <strong className="text-yellow-400">fotos vendidas</strong> e nao pode ser excluido.
                  Os clientes precisam ter acesso ao download e os registros financeiros devem ser preservados.
                  <br /><br />
                  Voce pode <strong className="text-foreground">inativar</strong> o evento para que ele nao apareca mais nas buscas.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full glass hover:bg-white/10 py-3 rounded-xl text-sm font-medium transition-colors"
                >
                  Entendi
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted text-center mb-6">
                  Tem certeza que deseja excluir <strong className="text-foreground">{event.title}</strong>?
                  Todas as <strong className="text-foreground">{photos.length} fotos</strong> serao
                  removidas permanentemente. Essa acao nao pode ser desfeita.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 glass hover:bg-white/10 py-3 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteEvent}
                    disabled={deleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      "Sim, excluir tudo"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Event status */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <CalendarClock className="w-4 h-4 text-primary" />
          Status do evento
        </div>
        <div className="flex gap-2 mb-3">
          {(["active", "inactive", "scheduled"] as const).map((s) => {
            const labels = { active: "Ativo", inactive: "Inativo", scheduled: "Agendado" };
            const isActive = event.status === s;
            const colors = {
              active: isActive ? "bg-primary text-white" : "glass hover:bg-white/10 text-muted",
              inactive: isActive ? "bg-muted/30 text-foreground" : "glass hover:bg-white/10 text-muted",
              scheduled: isActive ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "glass hover:bg-white/10 text-muted",
            };
            return (
              <button
                key={s}
                onClick={async () => {
                  const updates: Record<string, unknown> = { status: s };
                  if (s !== "scheduled") updates.scheduled_at = null;
                  await supabase.from("events").update(updates).eq("id", event.id);
                  setEvent({ ...event, status: s, scheduled_at: s !== "scheduled" ? null : event.scheduled_at });
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border border-transparent ${colors[s]}`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
        {event.status === "scheduled" && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={async (e) => {
                setScheduledAt(e.target.value);
                if (e.target.value) {
                  const iso = new Date(e.target.value).toISOString();
                  await supabase.from("events").update({ scheduled_at: iso }).eq("id", event.id);
                  setEvent({ ...event, scheduled_at: iso });
                }
              }}
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors [color-scheme:dark]"
            />
          </div>
        )}
        <p className="text-xs text-muted mt-2">
          {event.status === "active" && "Evento visivel para clientes no site."}
          {event.status === "inactive" && "Evento oculto. Clientes nao conseguem ver."}
          {event.status === "scheduled" && "Evento sera ativado automaticamente na data definida."}
        </p>
      </div>

      {/* Price per photo + Package */}
      <div className="glass rounded-2xl p-5 mb-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="w-4 h-4 text-primary" />
          Precos
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            Preco por foto
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">R$</span>
            <input
              type="text"
              value={priceInput}
              onChange={(e) => { setPriceInput(e.target.value); setPriceSaved(false); }}
              placeholder="15,00"
              className="w-24 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
            />
            <button
              onClick={async () => {
                if (!event || priceSaved) return;
                setSavingPrice(true);
                const cents = Math.round(parseFloat(priceInput.replace(",", ".")) * 100);
                if (isNaN(cents) || cents <= 0) { setSavingPrice(false); return; }

                const packageCents = packagePriceInput
                  ? Math.round(parseFloat(packagePriceInput.replace(",", ".")) * 100)
                  : null;

                await supabase.from("events").update({
                  price_per_photo_cents: cents,
                  package_price_cents: packageCents,
                }).eq("id", event.id);
                setEvent({ ...event, price_per_photo_cents: cents, package_price_cents: packageCents });
                setSavingPrice(false);
                setPriceSaved(true);
              }}
              disabled={savingPrice}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                priceSaved
                  ? "bg-primary/15 text-primary border border-primary/30 cursor-default"
                  : "bg-primary hover:bg-primary-dark text-white disabled:opacity-50"
              }`}
            >
              {savingPrice ? "Salvando..." : priceSaved ? (
                <><Check className="w-3.5 h-3.5" />Salvo</>
              ) : "Salvar"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Package className="w-3.5 h-3.5" />
            Pacote (todas as fotos)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">R$</span>
            <input
              type="text"
              value={packagePriceInput}
              onChange={(e) => { setPackagePriceInput(e.target.value); setPriceSaved(false); }}
              placeholder="Opcional"
              className="w-24 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          Voce recebe 93% (comissao da plataforma: 7%). O pacote permite ao cliente comprar todas as fotos reconhecidas por um preco unico.
        </p>
      </div>

      {/* Share link & QR Code */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <Link2 className="w-4 h-4 text-primary" />
          Compartilhar evento
        </div>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={`${typeof window !== "undefined" ? window.location.origin : "https://fotonatrip.com.br"}/eventos/${event.id}`}
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-muted focus:outline-none select-all"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => {
              const url = `${window.location.origin}/eventos/${event.id}`;
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {copied ? (<><Check className="w-4 h-4 text-primary" />Copiado!</>) : (<><Copy className="w-4 h-4" />Copiar</>)}
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${showQR ? "bg-primary/10 text-primary" : "bg-white/10 hover:bg-white/15"}`}
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </button>
        </div>
        {showQR && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeCanvas
                value={`${typeof window !== "undefined" ? window.location.origin : "https://fotonatrip.com.br"}/eventos/${event.id}`}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <button
              onClick={() => {
                const canvas = document.querySelector(".glass canvas") as HTMLCanvasElement;
                if (!canvas) return;
                const link = document.createElement("a");
                link.download = `qrcode-${event.title.toLowerCase().replace(/\s+/g, "-")}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              }}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-light transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar QR Code
            </button>
            <p className="text-xs text-muted text-center">
              Imprima ou compartilhe o QR Code para seus clientes acessarem o evento.
            </p>
          </div>
        )}
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-primary animate-pulse" />
              Processando {Math.min(uploadProgress.done + 1, uploadProgress.total)} de {uploadProgress.total}...
            </span>
            <span className="text-sm text-primary font-semibold">
              {uploadProgress.total > 0 ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted">
              Upload + watermark + deteccao facial por IA (servidor)
            </p>
            <button
              onClick={cancelUpload}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {reprocessStatus && (
        <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3">
          <ScanFace className={`w-5 h-5 text-primary ${reprocessing ? "animate-pulse" : ""}`} />
          <span className="text-sm text-muted">{reprocessStatus}</span>
        </div>
      )}

      {/* Photos grid */}
      {photos.length === 0 ? (
        <div className="glass rounded-2xl text-center py-16">
          <ImageIcon className="w-12 h-12 text-muted/30 mx-auto mb-4" />
          <p className="text-muted mb-1">Nenhuma foto neste evento.</p>
          <p className="text-muted text-sm">
            Clique em &quot;Enviar fotos&quot; para comecar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {photos.map((photo) => {
            const url = getPhotoUrl(photo.storage_path);
            const isCover = event.cover_url === url;

            return (
              <div
                key={photo.id}
                onClick={() => setPreviewPhoto(photo)}
                className={`group relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-light border-2 transition-colors cursor-pointer ${
                  isCover ? "border-primary" : "border-border"
                }`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                {isCover && (
                  <div className="absolute top-2 left-2 bg-primary rounded-full px-2.5 py-1 flex items-center gap-1">
                    <Star className="w-3 h-3 text-white fill-white" />
                    <span className="text-[10px] text-white font-medium">Capa</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!isCover && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetCover(photo.storage_path); }}
                      className="p-2 bg-primary/80 hover:bg-primary rounded-lg text-white transition-colors"
                      title="Definir como capa"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                    className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors"
                    title="Excluir foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {photo.status === "processing" && (
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1 flex items-center gap-1">
                    <ScanFace className="w-3 h-3 text-primary animate-pulse" />
                    <span className="text-[10px] text-white">Detectando</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Photo preview lightbox */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewPhoto(null)} className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>

            <img
              src={getPhotoUrl(previewPhoto.storage_path)}
              alt=""
              className="max-h-[80vh] w-auto rounded-xl"
            />

            <div className="flex items-center justify-between mt-4">
              <p className="text-white/50 text-sm">{previewPhoto.original_filename}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSetCover(previewPhoto.storage_path)}
                  className="flex items-center gap-1.5 bg-primary/80 hover:bg-primary text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Definir como capa
                </button>
                <button
                  onClick={() => { handleDeletePhoto(previewPhoto.id); setPreviewPhoto(null); }}
                  className="flex items-center gap-1.5 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>

            {photos.findIndex((p) => p.id === previewPhoto.id) > 0 && (
              <button
                onClick={() => {
                  const idx = photos.findIndex((p) => p.id === previewPhoto.id);
                  setPreviewPhoto(photos[idx - 1]);
                }}
                className="absolute left-[-60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {photos.findIndex((p) => p.id === previewPhoto.id) < photos.length - 1 && (
              <button
                onClick={() => {
                  const idx = photos.findIndex((p) => p.id === previewPhoto.id);
                  setPreviewPhoto(photos[idx + 1]);
                }}
                className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
