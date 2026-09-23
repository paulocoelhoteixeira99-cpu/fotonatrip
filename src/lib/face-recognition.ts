const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

// Resize image before uploading to reduce transfer time
async function resizeForUpload(file: File, maxSize = 2400): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Skip resize if already small enough
      if (img.width <= maxSize && img.height <= maxSize) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      const scale = maxSize / Math.max(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export async function getEmbeddingFromFile(
  file: File
): Promise<number[] | null> {
  const resized = await resizeForUpload(file, 1600);
  const formData = new FormData();
  formData.append("file", resized);

  const res = await fetch(`${API_URL}/extract-embedding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: formData,
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.embedding;
}

export interface ProcessResult {
  original_path: string;
  watermark_path: string;
  original_url: string;
  watermark_url: string;
  file_size: number;
  embeddings: { embedding: number[]; bbox: number[] }[];
  faces_found: number;
}

export async function processPhoto(
  file: File,
  photographerId: string,
  eventId: string,
  signal?: AbortSignal
): Promise<ProcessResult | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("photographer_id", photographerId);
  formData.append("event_id", eventId);

  const res = await fetch(`${API_URL}/process-photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: formData,
    signal,
  });

  if (!res.ok) return null;

  return res.json();
}
