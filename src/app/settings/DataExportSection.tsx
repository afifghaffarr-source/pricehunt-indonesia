"use client";

import { useState } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function DataExportSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setError("");
    setIsExporting(true);

    try {
      const response = await fetch("/api/user/export");

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Gagal mengekspor data");
        setIsExporting(false);
        return;
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pricehunt-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting data:", err);
      setError("Terjadi kesalahan saat mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-3 text-sm text-gray-600">
        <p>
          Unduh semua data Anda dalam format JSON. Data yang diekspor meliputi:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Informasi profil</li>
          <li>Daftar produk favorit</li>
          <li>Pengaturan alert harga</li>
          <li>Riwayat ulasan produk</li>
        </ul>
        <p className="text-xs text-gray-500">
          Data akan diunduh sebagai file JSON yang dapat Anda simpan atau gunakan
          untuk keperluan pribadi. Kami menghormati privasi dan hak Anda atas data
          pribadi.
        </p>
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting}
        className={buttonVariants({ variant: "default", size: "default" })}
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Mengekspor...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Ekspor Data Saya
          </>
        )}
      </button>
    </div>
  );
}
