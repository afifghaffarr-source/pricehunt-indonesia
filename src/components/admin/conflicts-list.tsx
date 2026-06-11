"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

type Conflict = {
  id: string;
  offer_id: string;
  conflicting_offer_id: string;
  conflict_type: string;
  price_diff_percent: number;
  detected_at: string;
  resolved: boolean;
  offer: {
    title: string;
    price: number;
    marketplace: { name: string };
  };
  conflicting_offer: {
    price: number;
    marketplace: { name: string };
  };
};

export function ConflictsList() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/data-collection/conflicts");
      const data = await response.json();
      
      if (data.success) {
        setConflicts(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load conflicts:", error);
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (conflictId: string, keepOfferId: string) => {
    try {
      const response = await fetch("/api/admin/data-collection/resolve-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflict_id: conflictId, keep_offer_id: keepOfferId }),
      });

      const data = await response.json();
      if (data.success) {
        loadConflicts(); // Reload list
      }
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Price Conflicts</CardTitle>
          <Button onClick={loadConflicts} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Deteksi otomatis price conflicts antar offers
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : conflicts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
            <p>No conflicts found! 🎉</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Conflict Type</TableHead>
                <TableHead>Price Diff</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conflicts.map((conflict) => (
                <TableRow key={conflict.id}>
                  <TableCell>
                    <div className="font-medium">{conflict.offer.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {conflict.offer.marketplace.name}: Rp {conflict.offer.price.toLocaleString("id-ID")} vs{" "}
                      {conflict.conflicting_offer.marketplace.name}: Rp {conflict.conflicting_offer.price.toLocaleString("id-ID")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {conflict.conflict_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-orange-600">
                    {conflict.price_diff_percent.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(conflict.detected_at), {
                      addSuffix: true,
                      locale: localeId,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveConflict(conflict.id, conflict.offer_id)}
                      >
                        Keep Original
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveConflict(conflict.id, conflict.conflicting_offer_id)}
                      >
                        Keep New
                      </Button>
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
