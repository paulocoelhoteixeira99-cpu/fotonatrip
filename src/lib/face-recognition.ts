const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export async function getEmbeddingFromFile(
  file: File
): Promise<number[] | null> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/extract-embedding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: formData,
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.embedding;
}

export async function processPhoto(
  file: File,
  photographerId: string,
  eventId: string
): Promise<{
  original_path: string;
  watermark_path: string;
  original_url: string;
  watermark_url: string;
  file_size: number;
  embeddings: { embedding: number[]; bbox: number[] }[];
  faces_found: number;
} | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("photographer_id", photographerId);
  formData.append("event_id", eventId);

  const res = await fetch(`${API_URL}/process-photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: formData,
  });

  if (!res.ok) return null;

  return res.json();
}
