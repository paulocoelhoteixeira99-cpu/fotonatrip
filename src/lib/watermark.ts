export async function generateWatermark(file: File): Promise<Blob> {
  const img = await loadImage(file);

  // Reduce resolution (max 600px - enough to recognize, not enough to use)
  const maxSize = 600;
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);

  const canvas = document.createElement("canvas");
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext("2d")!;

  // Draw image at reduced size
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Apply subtle blur
  ctx.filter = "blur(1px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";

  // Watermark settings
  const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
  const fontSize = Math.max(canvas.width * 0.07, 18);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Rotate and tile the watermark diagonally
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 4);

  const text = "fotonatrip";
  const spacing = fontSize * 5;

  for (let y = -diagonal; y < diagonal; y += spacing) {
    for (let x = -diagonal; x < diagonal; x += spacing) {
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();

  // Border overlay
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  const margin = 15;
  ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      "image/jpeg",
      0.45
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
