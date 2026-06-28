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
import { RefreshCw, ExternalLink, CheckCircle, XCircle, Check, X, Loader2 } from "lucide-react";
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

type ActionState = "idle" | "approving" | "rejecting";

export function OffersList() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  // Per-row action state so we can disable buttons on the row under
  // mutation without blocking the rest of the table. Key is offer.id.
  const [pendingAction, setPendingAction] = useState<Record<string, ActionState>>({});
  const [actionError, setActionError] = useState<string | null>(null);

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

  /**
   * Approve or reject an offer via PATCH /api/admin/data-collection/offers/[id]/validate.
   * On success, refresh the list so the row reflects the new status badge.
   * The endpoint is admin-only (requireAdmin guard server-side) and writes
   * an admin_audit_log row with from→to status diff.
   */
  const decideOffer = useCallback(
    async (offer: Offer, action: "approve" | "reject") => {
      if (pendingAction[offer.id]) return; // already in-flight
      setActionError(null);
      setPendingAction((p) => ({ ...p, [offer.id]: action === "approve" ? "approving" : "rejecting" }));
      try {
        const targetStatus = action === "approve" ? "valid" : "rejected";
        const res = await csrfFetch(
          `/api/admin/data-collection/offers/${offer.id}/validate`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetStatus }),
          },
        );
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !json.success) {
          setActionError(json.error ?? `Failed to ${action} offer (HTTP ${res.status})`);
          return;
        }
        await loadOffers();
      } catch (err) {
        console.error(`Failed to ${action} offer:`, err);
        setActionError(err instanceof Error ? err.message : `Failed to ${action} offer`);
      } finally {
        setPendingAction((p) => {
          const next = { ...p };
          delete next[offer.id];
          return next;
        });
      }
    },
    [pendingAction, loadOffers],
  );

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
          <Button onClick={loadOffers} variant="outline" size="icon" aria-label="Refresh offers list">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <strong className="font-semibold">Action failed:</strong> {actionError}
          </div>
        )}
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
                    <div className="flex items-center gap-1">
                      {/* Approve / Reject buttons only for pending offers. The
                          server-side allowlist also restricts the action other
                          admins can take; we just hide UI affordances in
                          already-decided states to reduce noise. */}
                      {offer.validation_status === "pending" && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Approve ${offer.title}`}
                            title="Approve"
                            disabled={!!pendingAction[offer.id]}
                            onClick={() => decideOffer(offer, "approve")}
                            className="h-9 w-9 text-green-600 hover:bg-green-500/10 hover:text-green-700"
                          >
                            {pendingAction[offer.id] === "approving" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Reject ${offer.title}`}
                            title="Reject"
                            disabled={!!pendingAction[offer.id]}
                            onClick={() => decideOffer(offer, "reject")}
                            className="h-9 w-9 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                          >
                            {pendingAction[offer.id] === "rejecting" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                      {offer.url && (
                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                          aria-label={`Open ${offer.title} on marketplace`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
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
