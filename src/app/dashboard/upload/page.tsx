"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Upload,
  ImagePlus,
  Loader2,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  event_date: string | null;
}

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  preview: string;
}

export default function UploadPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
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

  async function handleUpload() {
    if (!selectedEvent || files.length === 0) return;

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "done") continue;

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" } : f
        )
      );

      const file = files[i].file;
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${selectedEvent}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, file);

      if (uploadError) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error" } : f
          )
        );
        continue;
      }

      const { error: dbError } = await supabase.from("photos").insert({
        event_id: selectedEvent,
        photographer_id: user.id,
        storage_path: path,
        original_filename: file.name,
        file_size: file.size,
        status: "ready",
      });

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: dbError ? "error" : "done" } : f
        )
      );
    }

    setUploading(false);
  }

  const doneCount = files.filter((f) => f.status === "done").length;
  const allDone = files.length > 0 && doneCount === files.length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Upload de fotos</h1>
      <p className="text-muted text-sm mb-8">
        Selecione o evento e envie suas fotos em lote.
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
          <p className="text-sm font-medium mb-1">
            Clique para selecionar fotos
          </p>
          <p className="text-xs text-muted">
            JPG, PNG ou WebP. Multiplas fotos de uma vez.
          </p>
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

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">
              {files.length} foto{files.length !== 1 && "s"} selecionada
              {files.length !== 1 && "s"}
              {doneCount > 0 && ` · ${doneCount} enviada${doneCount !== 1 ? "s" : ""}`}
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
                <img
                  src={f.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
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
      {files.length > 0 && !allDone && (
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedEvent}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              Enviar {files.length} foto{files.length !== 1 && "s"}
            </>
          )}
        </button>
      )}

      {allDone && (
        <div className="glass rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-medium mb-1">Upload concluido!</p>
          <p className="text-sm text-muted mb-4">
            Todas as fotos foram enviadas com sucesso.
          </p>
          <button
            onClick={() => router.push(`/dashboard/eventos/${selectedEvent}`)}
            className="text-sm text-primary hover:text-primary-light transition-colors"
          >
            Ver evento
          </button>
        </div>
      )}
    </div>
  );
}
