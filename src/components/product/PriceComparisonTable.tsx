import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getMarketplaceName,
  getMarketplaceColor,
  formatRupiah,
} from "@/lib/utils";
import type { MarketplacePrice } from "@/lib/types";
import { ExternalLink, CheckCircle2, XCircle, Truck } from "lucide-react";

interface PriceComparisonTableProps {
  prices: MarketplacePrice[];
  lowestPrice: number;
}

export function PriceComparisonTable({
  prices,
  lowestPrice,
}: PriceComparisonTableProps) {
  const sorted = [...prices].sort((a, b) => a.price - b.price);

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Marketplace</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead className="hidden sm:table-cell">Ongkir</TableHead>
            <TableHead className="hidden sm:table-cell">Total</TableHead>
            <TableHead className="hidden md:table-cell">Rating</TableHead>
            <TableHead className="hidden md:table-cell">Stok</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const isLowest = item.price === lowestPrice;
            const total = item.price + item.shippingCost;
            const color = getMarketplaceColor(item.marketplace);

            return (
              <TableRow
                key={item.marketplace}
                className={isLowest ? "bg-primary/5" : ""}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium">
                      {getMarketplaceName(item.marketplace)}
                    </span>
                    {isLowest && (
                      <Badge variant="default" className="ml-1 text-xs">
                        Termurah
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-semibold">
                  {formatRupiah(item.price)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {item.shippingCost === 0 ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Truck className="h-3 w-3" />
                      Gratis
                    </span>
                  ) : (
                    formatRupiah(item.shippingCost)
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell font-semibold">
                  {formatRupiah(total)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm">
                    {item.sellerRating >= 4.5
                      ? "⭐ "
                      : item.sellerRating >= 4
                      ? ""
                      : ""}
                    {item.sellerRating}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {item.inStock ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Kunjungi
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
