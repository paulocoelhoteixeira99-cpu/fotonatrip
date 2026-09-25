"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { processPhoto } from "@/lib/face-recognition";
import { useRouter } from "next/navigation";
import {
  Upload,
  ImagePlus,
  Loader2,
  CheckCircle2,
  XCircle,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { deletePhotoFiles } from "@/lib/photos";

interface Event {
  id: string;
  title: string;
  event_date: string | null;
}

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error" | "skipped";
  preview: string;
}

interface DuplicateInfo {
  filename: string;
  photoId: string;
  storagePath: string;
  watermarkPath: string;
}

export default function UploadPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadEvents() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("events")
        .select("id, title, event_date")
        .eq("photographer_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setEvents(data || []);
      if (data && data.length > 0) setSelectedEvent(data[0].id);
      setLoadingEvents(false);
    }

    loadEvents();
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: UploadFile[] = Array.from(selected).map((file) => ({
      file,
      status: "pending",
      preview: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function checkDuplicates() {
    if (!selectedEvent || files.length === 0) return;

    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    const filenames = pendingFiles.map((f) => f.file.name);

    const { data: existing } = await supabase
      .from("photos")
      .select("id, original_filename, storage_path, watermark_path")
      .eq("event_id", selectedEvent)
      .in("original_filename", filenames);

    if (existing && existing.length > 0) {
      setDuplicates(
        existing.map((p) => ({
          filename: p.original_filename,
          photoId: p.id,
          storagePath: p.storage_path,
          watermarkPath: p.watermark_path,
        }))
      );
      setShowDuplicateModal(true);
      return;
    }

    startUpload();
  }

  async function handleDuplicateReplace() {
    setShowDuplicateModal(false);

    // Delete existing duplicate photos from DB and storage
    const photoIds = duplicates.map((d) => d.photoId);
    const paths = duplicates.flatMap((d) =>
      [d.storagePath, d.watermarkPath].filter(Boolean)
    );

    await supabase.from("face_embeddings").delete().in("photo_id", photoIds);
    await supabase.from("photos").delete().in("id", photoIds);
    if (paths.length > 0) await deletePhotoFiles(paths);

    setDuplicates([]);
    startUpload();
  }

  function handleDuplicateSkip() {
    setShowDuplicateModal(false);

    const dupNames = new Set(duplicates.map((d) => d.filename));

    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" && dupNames.has(f.file.name)
          ? { ...f, status: "skipped" as const }
          : f
      )
    );

    setDuplicates([]);

    // Check if there are remaining non-duplicate pending files
    const remaining = files.filter(
      (f) => f.status === "pending" && !dupNames.has(f.file.name)
    );
    if (remaining.length > 0) {
      startUpload();
    }
  }

  function handleDuplicateCancel() {
    setShowDuplicateModal(false);
    setDuplicates([]);
  }

  async function startUpload() {
    if (!selectedEvent || files.length === 0) return;

    setUploading(true);

    const abort = new AbortController();
    abortRef.current = abort;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const CONCURRENT = 3;
    const pendingIndexes = files
      .map((f, i) => (f.status === "pending" ? i : -1))
      .filter((i) => i >= 0);

    const queue = [...pendingIndexes];

    async function uploadOne(idx: number) {
      if (abort.signal.aborted) return;

      setFiles((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, status: "uploading" } : f))
      );

      const file = files[idx].file;

      try {
        const result = await processPhoto(file, user!.id, selectedEvent, abort.signal);

        if (!result) {
          setFiles((prev) =>
            prev.map((f, i) => (i === idx ? { ...f, status: "error" } : f))
          );
          return;
        }

        const { data: photoData, error: dbError } = await supabase.from("photos").insert({
          event_id: selectedEvent,
          photographer_id: user!.id,
          storage_path: result.original_path,
          watermark_path: result.watermark_path,
          original_filename: file.name,
          file_size: result.file_size,
          status: "ready",
          processed_at: new Date().toISOString(),
        }).select().single();

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

        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, status: dbError ? "error" : "done" } : f))
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setFiles((prev) =>
            prev.map((f, i) => (i === idx ? { ...f, status: "error" } : f))
          );
        }
      }
    }

    const workers = Array.from({ length: CONCURRENT }, async () => {
      while (queue.length > 0 && !abort.signal.aborted) {
        const idx = queue.shift()!;
        await uploadOne(idx);
      }
    });

    await Promise.all(workers);
    abortRef.current = null;
    setUploading(false);
  }

  function cancelUpload() {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
  }

  const doneCount = files.filter((f) => f.status === "done").length;
  const skippedCount = files.filter((f) => f.status === "skipped").length;
  const allDone = files.length > 0 && doneCount + skippedCount === files.length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Upload de fotos</h1>
      <p className="text-muted text-sm mb-8">
        Selecione o evento e envie suas fotos em lote. O processamento (watermark + deteccao facial) e feito automaticamente no servidor.
      </p>

      {/* Event selector */}
      <div className="mb-6">
        <label className="text-sm text-muted mb-2 block">Evento</label>
        {loadingEvents ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando eventos...
          </div>
        ) : events.length === 0 ? (
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-muted" />
            <span className="text-sm text-muted">Nenhum evento ativo.</span>
            <button
              onClick={() => router.push("/dashboard/eventos/novo")}
              className="text-sm text-primary hover:text-primary-light transition-colors ml-auto"
            >
              Criar evento
            </button>
          </div>
        ) : (
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
                {event.event_date &&
                  ` — ${new Date(event.event_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Drop zone */}
      <label className="block glass rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer mb-6">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <Upload className="w-10 h-10 text-muted mb-4" />
          <p className="text-sm font-medium mb-1">Clique para selecionar fotos</p>
          <p className="text-xs text-muted">JPG, PNG ou WebP. Multiplas fotos de uma vez.</p>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {/* Progress bar */}
      {uploading && (() => {
        const uploadTotal = files.length - skippedCount;
        const pct = uploadTotal > 0 ? Math.round((doneCount / uploadTotal) * 100) : 0;
        return (
        <div className="mb-6 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              Processando {Math.min(doneCount + 1, uploadTotal)} de {uploadTotal}...
            </span>
            <span className="text-sm text-primary font-semibold">
              {pct}%
            </span>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted">
              {doneCount} de {uploadTotal} fotos processadas (upload + watermark + IA)
              {files.filter((f) => f.status === "error").length > 0 &&
                ` · ${files.filter((f) => f.status === "error").length} com erro`}
            </p>
            <button
              onClick={cancelUpload}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
        );
      })()}

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">
              {files.length} foto{files.length !== 1 && "s"} selecionada
              {files.length !== 1 && "s"}
              {doneCount > 0 && !uploading && ` · ${doneCount} enviada${doneCount !== 1 ? "s" : ""}`}
            </p>
            {!uploading && !allDone && (
              <button
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview));
                  setFiles([]);
                }}
                className="text-xs text-muted hover:text-red-400 transition-colors"
              >
                Limpar tudo
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {files.map((f, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-xl overflow-hidden bg-surface-light border border-border group"
              >
                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                {f.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                {f.status === "done" && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                )}
                {f.status === "error" && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-400" />
                  </div>
                )}
                {f.status === "skipped" && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mb-1" />
                    <span className="text-[10px] text-yellow-500 font-medium">Ignorada</span>
                  </div>
                )}
                {f.status === "pending" && !uploading && (
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && !allDone && files.some((f) => f.status === "pending") && (
        <button
          onClick={checkDuplicates}
          disabled={uploading || !selectedEvent}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              Enviar {files.filter((f) => f.status === "pending").length} foto{files.filter((f) => f.status === "pending").length !== 1 && "s"}
            </>
          )}
        </button>
      )}

      {allDone && (
        <div className="glass rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-medium mb-1">Upload concluido!</p>
          <p className="text-sm text-muted mb-4">
            {skippedCount > 0
              ? `${doneCount} foto${doneCount !== 1 ? "s" : ""} enviada${doneCount !== 1 ? "s" : ""}, ${skippedCount} ignorada${skippedCount !== 1 ? "s" : ""}.`
              : "Todas as fotos foram processadas com sucesso."}
          </p>
          <button
            onClick={() => router.push(`/dashboard/eventos/${selectedEvent}`)}
            className="text-sm text-primary hover:text-primary-light transition-colors"
          >
            Ver evento
          </button>
        </div>
      )}

      {/* Duplicate files modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold">Fotos duplicadas</h3>
                <p className="text-sm text-muted">
                  {duplicates.length} foto{duplicates.length !== 1 && "s"} ja
                  existe{duplicates.length === 1 && ""}{duplicates.length !== 1 && "m"} neste evento
                </p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 mb-5 max-h-40 overflow-y-auto">
              {duplicates.map((d, i) => (
                <p key={i} className="text-sm text-muted truncate py-0.5">
                  {d.filename}
                </p>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleDuplicateReplace}
                className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Substituir existentes
              </button>
              <button
                onClick={handleDuplicateSkip}
                className="w-full bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Ignorar duplicadas
              </button>
              <button
                onClick={handleDuplicateCancel}
                className="w-full text-muted hover:text-white py-2 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
