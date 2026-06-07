"use client";

import { useTransition } from "react";
import { updateProduct } from "@/app/actions/admin";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface UpdateProductFormProps {
  product: {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string | null;
    image_url: string | null;
    ai_verdict: string | null;
  };
}

export function UpdateProductForm({ product }: UpdateProductFormProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Info Produk</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            startTransition(async () => {
              await updateProduct(product.id, formData);
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama</label>
              <Input name="name" defaultValue={product.name} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input name="slug" defaultValue={product.slug} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Input name="category" defaultValue={product.category} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL Gambar</label>
              <Input name="image_url" defaultValue={product.image_url || ""} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi</label>
            <Input name="description" defaultValue={product.description || ""} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Verdict</label>
            <Input name="ai_verdict" defaultValue={product.ai_verdict || ""} />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
            ) : (
              "Simpan Perubahan"
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
