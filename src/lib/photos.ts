const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "";

export function getPhotoUrl(path: string): string {
  return `${CDN_URL}/${path}`;
}
