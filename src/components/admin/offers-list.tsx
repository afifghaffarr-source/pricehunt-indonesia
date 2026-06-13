"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { csrfFetch } from "@/lib/admin-csrf";

type Offer = {
  id: string;
  title: string;
  marketplace: { name: string };
  current_price: number;
  confidence_score: number;
  confidence_label: string;
  validation_status: string;
  source: string;
  last_checked_at: string;
  is_active: boolean;
  url: string | null;
};

export function OffersList() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (marketplaceFilter !== "all") params.set("marketplace", marketplaceFilter);
      if (search) params.set("search", search);

      const response = await csrfFetch(`/api/admin/data-collection/offers?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setOffers(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load offers:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, marketplaceFilter, search]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      valid: { variant: "default", label: "Valid" },
      conflict: { variant: "destructive", label: "Conflict" },
      stale: { variant: "secondary", label: "Stale" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getConfidenceBadge = (score: number, label: string) => {
    if (score >= 80) return <Badge variant="default">{label}</Badge>;
    if (score >= 60) return <Badge variant="secondary">{label}</Badge>;
    return <Badge variant="destructive">{label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offers Management</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="conflict">Conflict</SelectItem>
              <SelectItem value="stale">Stale</SelectItem>
            </SelectContent>
          </Select>
          <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Marketplace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Marketplaces</SelectItem>
              <SelectItem value="tokopedia">Tokopedia</SelectItem>
              <SelectItem value="shopee">Shopee</SelectItem>
              <SelectItem value="bukalapak">Bukalapak</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadOffers} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : offers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No offers found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {offer.title}
                  </TableCell>
                  <TableCell className="capitalize">{offer.marketplace.name}</TableCell>
                  <TableCell>Rp {offer.current_price.toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {offer.source === 'browser_collector' ? 'Browser' :
                       offer.source === 'manual_admin' ? 'Manual' :
                       offer.source === 'api_scraper' ? 'API' : offer.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getConfidenceBadge(offer.confidence_score, offer.confidence_label)}
                  </TableCell>
                  <TableCell>{getStatusBadge(offer.validation_status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(offer.last_checked_at), {
                      addSuffix: true,
                      locale: localeId,
                    })}
                  </TableCell>
                  <TableCell>
                    {offer.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell>
                    {offer.url && (
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
