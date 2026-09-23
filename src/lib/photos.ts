const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export function getPhotoUrl(path: string): string {
  return `${CDN_URL}/${path}`;
}

export async function deletePhotoFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await fetch(`${API_URL}/delete-files`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ paths }),
  });
}
