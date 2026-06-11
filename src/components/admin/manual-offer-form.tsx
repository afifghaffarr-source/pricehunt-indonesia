"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";

export function ManualOfferForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState({
    marketplace: "tokopedia",
    title: "",
    url: "",
    price: "",
    original_price: "",
    seller_name: "",
    stock_status: "in_stock",
    condition: "new",
    image_url: "",
    category_hint: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/data-collection/manual-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace: formData.marketplace,
          title: formData.title,
          url: formData.url,
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
          seller_name: formData.seller_name || undefined,
          stock_status: formData.stock_status,
          condition: formData.condition,
          image_url: formData.image_url || undefined,
          category_hint: formData.category_hint || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Reset form
        setFormData({
          marketplace: "tokopedia",
          title: "",
          url: "",
          price: "",
          original_price: "",
          seller_name: "",
          stock_status: "in_stock",
          condition: "new",
          image_url: "",
          category_hint: "",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to submit offer: " + (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Offer Input</CardTitle>
        <p className="text-sm text-muted-foreground">
          Input offer data secara manual jika browser collector tidak bisa digunakan
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marketplace">Marketplace *</Label>
              <Select
                value={formData.marketplace}
                onValueChange={(value) => setFormData({ ...formData, marketplace: value })}
              >
                <SelectTrigger id="marketplace">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tokopedia">Tokopedia</SelectItem>
                  <SelectItem value="shopee">Shopee</SelectItem>
                  <SelectItem value="bukalapak">Bukalapak</SelectItem>
                  <SelectItem value="lazada">Lazada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Product Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Samsung Galaxy S24 Ultra 12/256 GB"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Product URL *</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://tokopedia.com/..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Current Price (Rp) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="13250000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="original_price">Original Price (Rp)</Label>
              <Input
                id="original_price"
                type="number"
                value={formData.original_price}
                onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                placeholder="15000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seller_name">Seller Name</Label>
              <Input
                id="seller_name"
                value={formData.seller_name}
                onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                placeholder="Samsung Official Store"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_status">Stock Status</Label>
              <Select
                value={formData.stock_status}
                onValueChange={(value) => setFormData({ ...formData, stock_status: value })}
              >
                <SelectTrigger id="stock_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="preorder">Preorder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_hint">Category Hint</Label>
            <Input
              id="category_hint"
              value={formData.category_hint}
              onChange={(e) => setFormData({ ...formData, category_hint: e.target.value })}
              placeholder="electronics/smartphones"
            />
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Offer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
