"use client";

import { useActionState } from "react";
import { createProduct, type AdminState } from "./actions";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateProductFormProps {
  categories: string[];
}

export function CreateProductForm({ categories }: CreateProductFormProps) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    createProduct,
    undefined
  );

  return (
    <form action={action} className="rounded-lg border p-4 space-y-4">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          Produk berhasil ditambahkan!
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Nama Produk</label>
          <Input id="name" name="name" placeholder="Samsung Galaxy S25" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="slug" className="text-sm font-medium">Slug (opsional)</label>
          <Input id="slug" name="slug" placeholder="samsung-galaxy-s25" />
        </div>
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">Kategori</label>
          <Select name="category" defaultValue="Smartphone">
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="image_url" className="text-sm font-medium">URL Gambar</label>
          <Input id="image_url" name="image_url" placeholder="https://..." />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">Deskripsi</label>
        <Input id="description" name="description" placeholder="Deskripsi produk..." />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        {pending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
        ) : (
          "Tambah Produk"
        )}
      </button>
    </form>
  );
}
