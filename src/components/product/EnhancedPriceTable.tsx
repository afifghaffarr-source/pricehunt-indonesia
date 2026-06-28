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
import type { Marketplace } from "@/lib/types";
import { ExternalLink, CheckCircle2, XCircle, Truck } from "lucide-react";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SourceLabel } from "./SourceLabel";
import { LastCheckedTimestamp } from "./LastCheckedTimestamp";
import { StaleDataBadge } from "./StaleDataBadge";
import { RecheckPriceButton } from "./RecheckPriceButton";
import { ReportPriceForm } from "./ReportPriceForm";

interface EnhancedMarketplacePrice {
  marketplace: Marketplace;
  price: number;
  shippingCost: number;
  inStock: boolean;
  rating?: number;
  url: string;
  // Enhanced metadata (from migration 110)
  offer_id?: string;
  confidence_score?: number;
  confidence_label?: string;
  validation_status?: "pending" | "verified" | "flagged" | "rejected";
  last_seen_at?: string;
  source?: "browser_collector" | "manual_admin" | "api_scraper";
}

interface EnhancedPriceTableProps {
  prices: EnhancedMarketplacePrice[];
  lowestPrice: number;
  productId: string;
  productName: string;
}

export function EnhancedPriceTable({
  prices,
  lowestPrice,
  productId,
  productName,
}: EnhancedPriceTableProps) {
  const sorted = [...prices].sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marketplace</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead className="hidden sm:table-cell">Ongkir</TableHead>
              <TableHead className="hidden sm:table-cell">Total</TableHead>
              <TableHead className="hidden lg:table-cell">Kepercayaan</TableHead>
              <TableHead className="hidden lg:table-cell">Update</TableHead>
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
                    <div className="space-y-1.5">
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
                      
                      {/* Enhanced metadata badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.confidence_label && (
                          <ConfidenceBadge
                            label={item.confidence_label}
                            score={item.confidence_score}
                          />
                        )}
                        {item.source && <SourceLabel source={item.source} />}
                        {item.last_seen_at && (
                          <StaleDataBadge lastSeenAt={item.last_seen_at} />
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-semibold">
                    {formatRupiah(item.price)}
                  </TableCell>

                  <TableCell className="hidden sm:table-cell">
                    {item.shippingCost === 0 ? (
                      <span className="flex items-center gap-1 text-green-700">
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

                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      {item.inStock ? (
                        <CheckCircle2 className="h-4 w-4 text-green-700" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-700" />
                      )}
                      <span className="text-sm text-foreground/80">
                        {item.inStock ? "Tersedia" : "Habis"}
                      </span>
                      {item.rating && (
                        <span className="text-sm">⭐ {item.rating}</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {item.last_seen_at && (
                      <LastCheckedTimestamp
                        lastSeenAt={item.last_seen_at}
                        showStaleWarning={false}
                      />
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({
                          variant: isLowest ? "default" : "outline",
                          size: "sm",
                        })}
                      >
                        {isLowest ? "Beli Sekarang" : "Lihat"}
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Action buttons below table */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <RecheckPriceButton productId={productId} className="flex-shrink-0" />
        
        {sorted.length > 0 && sorted[0].offer_id && (
          <ReportPriceForm
            offerId={sorted[0].offer_id}
            productName={productName}
            currentPrice={sorted[0].price}
            marketplaceName={getMarketplaceName(sorted[0].marketplace)}
          />
        )}
      </div>
    </div>
  );
}
