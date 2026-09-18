"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  Download,
  ShoppingBag,
  ScanFace,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface OrderWithItems {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  items: {
    id: string;
    photo_id: string;
    price_cents: number;
    downloaded_at: string | null;
    photo: {
      storage_path: string;
      watermark_path: string | null;
    };
  }[];
}

export default function MinhasComprasPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("orders")
      .select(`
        id, status, total_cents, created_at, payment_id,
        order_items (
          id, photo_id, price_cents, downloaded_at,
          photos:photo_id (storage_path, watermark_path)
        )
      `)
      .or("status.neq.pending,payment_id.not.is.null")
      .order("created_at", { ascending: false });

    if (data) {
      const mapped = data.map((order: any) => ({
        ...order,
        items: order.order_items?.map((item: any) => ({
          ...item,
          photo: item.photos,
        })) || [],
      }));
      setOrders(mapped);
    }
    setLoading(false);
  }

  async function handleDownload(item: OrderWithItems["items"][0]) {
    setDownloading(item.id);

    // Get signed URL for original photo (not watermarked)
    const { data, error } = await supabase.storage
      .from("photos")
      .createSignedUrl(item.photo.storage_path, 300); // 5 min expiry

    if (error || !data?.signedUrl) {
      alert("Erro ao gerar link de download. Tente novamente.");
      setDownloading(null);
      return;
    }

    // Track download
    await supabase
      .from("order_items")
      .update({ downloaded_at: new Date().toISOString() })
      .eq("id", item.id);

    // Download
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = `fotonatrip-${item.photo_id.slice(0, 8)}.jpg`;
    a.click();

    setDownloading(null);
  }

  const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; color: string }> = {
    paid: { icon: CheckCircle, label: "Pago", color: "text-primary" },
    pending: { icon: Clock, label: "Pendente", color: "text-yellow-400" },
    failed: { icon: XCircle, label: "Falhou", color: "text-red-400" },
    refunded: { icon: XCircle, label: "Reembolsado", color: "text-muted" },
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-primary" />
            Minhas compras
          </h1>
          <p className="text-muted mb-10">
            Suas fotos compradas e downloads disponiveis.
          </p>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="glass rounded-3xl p-16 text-center">
              <ShoppingBag className="w-16 h-16 text-muted/20 mx-auto mb-6" />
              <p className="text-muted mb-6">
                Voce ainda nao fez nenhuma compra.
              </p>
              <Link
                href="/buscar"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <ScanFace className="w-5 h-5" />
                Buscar minhas fotos
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const cfg = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = cfg.icon;

                return (
                  <div key={order.id} className="glass rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          Pedido #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted">
                          {new Date(order.created_at).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`flex items-center gap-1.5 text-sm ${cfg.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {cfg.label}
                        </span>
                        <span className="text-sm font-semibold">
                          {formatPrice(order.total_cents)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                      {order.items.map((item) => {
                        const thumbUrl = item.photo?.watermark_path || item.photo?.storage_path;
                        const url = thumbUrl
                          ? supabase.storage.from("photos").getPublicUrl(thumbUrl).data.publicUrl
                          : "";

                        return (
                          <div key={item.id} className="relative group">
                            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-surface-light">
                              {url && (
                                <img
                                  src={url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                            {order.status === "paid" && (
                              <button
                                onClick={() => handleDownload(item)}
                                disabled={downloading === item.id}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                              >
                                {downloading === item.id ? (
                                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <Download className="w-6 h-6 text-white" />
                                    <span className="text-white text-xs font-medium">
                                      Baixar original
                                    </span>
                                  </div>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
