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
import { AlertCircle, Flag } from "lucide-react";

interface ReportPriceFormProps {
  offerId: string;
  productName: string;
  currentPrice: number;
  marketplaceName: string;
}

export function ReportPriceForm({
  offerId,
  productName,
  currentPrice,
  marketplaceName,
}: ReportPriceFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [reportedPrice, setReportedPrice] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Call report API after migration 110
      const response = await fetch("/api/price-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: offerId,
          report_type: reportType,
          description,
          reported_price: reportedPrice ? parseFloat(reportedPrice) : null,
        }),
      });

      if (response.ok) {
        setOpen(false);
        setReportType("");
        setDescription("");
        setReportedPrice("");
        // TODO: Show success toast
      }
    } catch (error) {
      console.error("Report submission failed:", error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                  <SelectItem value="price_incorrect">Harga Tidak Sesuai</SelectItem>
                  <SelectItem value="out_of_stock">Produk Habis</SelectItem>
                  <SelectItem value="fake_discount">Diskon Palsu</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "price_incorrect" && (
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
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan detail masalah yang Anda temukan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

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
