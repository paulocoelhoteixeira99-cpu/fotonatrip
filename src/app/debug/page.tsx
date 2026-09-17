"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugPage() {
  const [info, setInfo] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { count: photosCount } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true });

      const { count: embeddingsCount } = await supabase
        .from("face_embeddings")
        .select("*", { count: "exact", head: true });

      const { count: eventsCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });

      // Check if vector column exists and its dimension
      const { data: sampleEmbedding, error: embError } = await supabase
        .from("face_embeddings")
        .select("id, photo_id, created_at")
        .limit(5);

      // Test the search function exists
      const testEmbedding = `[${new Array(128).fill(0).join(",")}]`;
      const { data: searchResult, error: searchError } = await supabase.rpc(
        "search_faces_by_embedding",
        {
          query_embedding: testEmbedding,
          similarity_threshold: 0.0,
          max_results: 5,
        }
      );

      setInfo({
        photos: photosCount,
        embeddings: embeddingsCount,
        events: eventsCount,
        sampleEmbeddings: sampleEmbedding,
        embeddingsError: embError?.message || null,
        searchFunctionWorks: !searchError,
        searchError: searchError
          ? `${searchError.message} | ${searchError.details} | ${searchError.hint}`
          : null,
        searchResultCount: searchResult?.length ?? null,
      });

      setLoading(false);
    }

    check();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center text-muted">Carregando debug...</div>
    );

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug - Status do Sistema</h1>
      <pre className="bg-surface-light border border-border rounded-xl p-6 text-sm overflow-auto whitespace-pre-wrap">
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
