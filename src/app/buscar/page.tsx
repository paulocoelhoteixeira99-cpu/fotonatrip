"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEmbeddingFromFile } from "@/lib/face-recognition";
import {
  Camera,
  Upload,
  ScanFace,
  ArrowLeft,
  ImageIcon,
  Loader2,
  MapPin,
} from "lucide-react";
import Link from "next/link";

interface SearchResult {
  photo_id: string;
  similarity: number;
  storage_path: string;
  watermark_path: string | null;
  event_id: string;
  event_title: string;
  photographer_name: string;
  price_cents: number;
}

export default function BuscarPage() {
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [noFace, setNoFace] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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
    if (!selfieFile) return;
    setSearching(true);
    setLoadingModels(true);
    setNoFace(false);

    // Get face embedding from selfie
    const embedding = await getEmbeddingFromFile(selfieFile);
    setLoadingModels(false);

    if (!embedding) {
      setNoFace(true);
      setSearching(false);
      return;
    }

    // Search in Supabase via pgvector
    const embeddingStr = `[${Array.from(embedding).join(",")}]`;
    const { data, error } = await supabase.rpc("search_faces_by_embedding", {
      query_embedding: embeddingStr,
      similarity_threshold: 0.92,
      max_results: 50,
    });

    if (error) {
      console.error("Search error:", error.message, error.details, error.hint);
    }

    console.log(`Search returned ${data?.length || 0} results`);
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              foto<span className="gradient-text">na</span>trip
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
        </div>
      </header>

      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        {/* Background glow */}
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative">
          <Link
            href="/"
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
              Envie uma selfie e nossa IA vai encontrar todas as fotos
              profissionais onde voce aparece.
            </p>
          </div>

          {!selfie ? (
            /* Upload area */
            <label className="block glass rounded-3xl border-2 border-dashed border-border hover:border-primary/50 transition-all cursor-pointer group max-w-lg mx-auto">
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="font-medium mb-2">Envie uma selfie</p>
                <p className="text-sm text-muted">
                  Tire uma foto ou escolha da galeria
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : !searched ? (
            /* Selfie preview + search */
            <div className="text-center">
              <div className="w-48 h-48 rounded-full overflow-hidden mx-auto mb-8 border-4 border-primary/20 glow-green">
                <img
                  src={selfie}
                  alt="Sua selfie"
                  className="w-full h-full object-cover"
                />
              </div>

              {noFace && (
                <div className="glass rounded-xl p-4 mb-6 max-w-md mx-auto">
                  <p className="text-sm text-red-400">
                    Nao conseguimos detectar um rosto na foto. Tente outra selfie
                    com o rosto bem visivel.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50 glow-green"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {loadingModels
                        ? "Carregando IA..."
                        : "Buscando..."}
                    </>
                  ) : (
                    <>
                      <ScanFace className="w-5 h-5" />
                      Buscar minhas fotos
                    </>
                  )}
                </button>
                <button
                  onClick={reset}
                  disabled={searching}
                  className="flex items-center justify-center gap-2 glass hover:bg-white/10 px-8 py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Trocar foto
                </button>
              </div>

              {searching && (
                <p className="text-sm text-muted mt-6 animate-pulse">
                  {loadingModels
                    ? "Carregando modelos de reconhecimento facial (primeira vez pode demorar)..."
                    : "Comparando seu rosto com as fotos da plataforma..."}
                </p>
              )}
            </div>
          ) : (
            /* Results */
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    {results.length > 0
                      ? `${results.length} foto${results.length !== 1 ? "s" : ""} encontrada${results.length !== 1 ? "s" : ""}`
                      : "Nenhuma foto encontrada"}
                  </h2>
                  {results.length > 0 && (
                    <p className="text-sm text-muted mt-1">
                      Mostrando as fotos com maior similaridade.
                    </p>
                  )}
                </div>
                <button
                  onClick={reset}
                  className="text-sm text-primary hover:text-primary-light transition-colors font-medium"
                >
                  Nova busca
                </button>
              </div>

              {results.length === 0 ? (
                <div className="glass rounded-3xl p-10 text-center">
                  <ImageIcon className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                  <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
                    Ainda nao encontramos fotos suas. Isso pode acontecer se
                    nenhum fotografo parceiro registrou o evento que voce
                    participou.
                  </p>
                  <button
                    onClick={reset}
                    className="text-sm text-primary hover:text-primary-light transition-colors font-medium"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.map((result) => {
                    const displayPath = result.watermark_path || result.storage_path;
                    const url = supabase.storage
                      .from("photos")
                      .getPublicUrl(displayPath).data.publicUrl;

                    return (
                      <div
                        key={result.photo_id}
                        className="group glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-all"
                      >
                        <div className="aspect-[3/4] overflow-hidden">
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-muted truncate mb-1">
                            {result.event_title}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              R$ {(result.price_cents / 100).toFixed(2).replace(".", ",")}
                            </span>
                            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {Math.round(result.similarity * 100)}% match
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
