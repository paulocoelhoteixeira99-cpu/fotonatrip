import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { secret } = await req.json();
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all referenced paths from photos table
  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path, watermark_path");

  const referencedPaths = new Set<string>();
  for (const p of photos || []) {
    if (p.storage_path) referencedPaths.add(p.storage_path);
    if (p.watermark_path) referencedPaths.add(p.watermark_path);
  }

  // List all files in storage bucket recursively
  const allFiles: string[] = [];

  async function listFolder(prefix: string) {
    const { data: items, error } = await supabase.storage
      .from("photos")
      .list(prefix, { limit: 1000 });

    if (error || !items) return;

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        // It's a file (has an id)
        allFiles.push(fullPath);
      } else {
        // It's a folder, recurse
        await listFolder(fullPath);
      }
    }
  }

  await listFolder("");

  // Find orphans
  const orphanPaths = allFiles.filter((path) => !referencedPaths.has(path));

  if (orphanPaths.length === 0) {
    return NextResponse.json({
      total_files: allFiles.length,
      referenced: referencedPaths.size,
      orphans: 0,
      deleted: 0,
    });
  }

  // Delete in batches of 100
  let totalDeleted = 0;
  const errors: string[] = [];

  for (let i = 0; i < orphanPaths.length; i += 100) {
    const batch = orphanPaths.slice(i, i + 100);
    const { data, error } = await supabase.storage.from("photos").remove(batch);
    if (error) {
      errors.push(error.message);
    } else {
      totalDeleted += data?.length || 0;
    }
  }

  return NextResponse.json({
    total_files: allFiles.length,
    referenced: referencedPaths.size,
    orphans: orphanPaths.length,
    deleted: totalDeleted,
    errors: errors.length > 0 ? errors : undefined,
    sample: orphanPaths.slice(0, 5),
  });
}
