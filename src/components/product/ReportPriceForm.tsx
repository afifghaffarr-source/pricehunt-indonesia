"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Flag, CheckCircle } from "lucide-react";

/**
 * Report type values MUST match the API enum in
 * src/app/api/price-report/route.ts. Keep this list in sync.
 */
const REPORT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "harga_berbeda", label: "Harga Tidak Sesuai" },
  { value: "produk_salah", label: "Produk Salah" },
  { value: "stok_habis", label: "Stok Habis" },
  { value: "link_rusak", label: "Link Rusak / Tidak Bisa Dibuka" },
  { value: "varian_berbeda", label: "Varian Berbeda" },
  { value: "lainnya", label: "Lainnya" },
];

interface ReportPriceFormProps {
  offerId: string;
  productName: string;
  currentPrice: number;
  marketplaceName: string;
}

type Result =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function ReportPriceForm({
  offerId,
  productName,
  currentPrice,
  marketplaceName,
}: ReportPriceFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [reportedPrice, setReportedPrice] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult({ kind: "idle" });

    try {
      // Payload matches the API contract: { offer_id, report_type, message, reported_price }
      const response = await fetch("/api/price-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          offer_id: offerId,
          report_type: reportType,
          message,
          reported_price: reportedPrice ? parseFloat(reportedPrice) : null,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (response.ok && data.success) {
        setResult({
          kind: "success",
          message:
            data.message ??
            "Laporan berhasil dikirim. Terima kasih atas kontribusinya!",
        });
        setReportType("");
        setMessage("");
        setReportedPrice("");
        // Close dialog after a short pause so the user can see the success.
        window.setTimeout(() => {
          setOpen(false);
          setResult({ kind: "idle" });
        }, 1500);
      } else {
        setResult({
          kind: "error",
          message:
            data.message ??
            "Gagal mengirim laporan. Silakan coba lagi dalam beberapa saat.",
        });
      }
    } catch (error) {
      console.error("Report submission failed:", error);
      setResult({
        kind: "error",
        message:
          "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { setOpen(o); if (!o) setResult({ kind: "idle" }); }}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 text-muted-foreground">
          <Flag className="mr-2 h-3.5 w-3.5" />
          Laporkan Harga Salah
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Laporkan Harga yang Salah</DialogTitle>
            <DialogDescription>
              Bantu kami menjaga akurasi data dengan melaporkan harga yang tidak sesuai.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Produk</Label>
              <p className="text-sm font-medium">{productName}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Marketplace</Label>
              <p className="text-sm">{marketplaceName}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Harga yang Tercatat
              </Label>
              <p className="text-sm">
                Rp {currentPrice.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-type">
                Jenis Laporan <span className="text-red-500">*</span>
              </Label>
              <Select value={reportType} onValueChange={setReportType} required>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Pilih jenis laporan" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reportType === "harga_berbeda" && (
              <div className="space-y-2">
                <Label htmlFor="reported-price">Harga yang Benar (Rp)</Label>
                <Input
                  id="reported-price"
                  type="number"
                  placeholder="Contoh: 5000000"
                  value={reportedPrice}
                  onChange={(e) => setReportedPrice(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Opsional: Masukkan harga yang Anda lihat di marketplace
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Pesan</Label>
              <Textarea
                id="message"
                placeholder="Jelaskan detail masalah yang Anda temukan..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            {result.kind === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}
            {result.kind === "success" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Tim kami akan memeriksa laporan Anda dalam 1-2 hari kerja dan
                memperbarui data jika diperlukan.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={!reportType || isSubmitting}>
              {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
