"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const EMAIL = "fotonatrip2026@gmail.com";

export default function CopyEmailButton() {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: open mailto
      window.location.href = `mailto:${EMAIL}`;
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-medium transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Email copiado!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copiar email
          </>
        )}
      </button>
      <span className="text-xs text-muted">{EMAIL}</span>
    </div>
  );
}
