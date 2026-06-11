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
import { RefreshCw, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

type RecheckRequest = {
  id: string;
  offer_id: string;
  user_id: string | null;
  reason: string | null;
  status: string;
  priority_score: number;
  requested_at: string;
  offer: {
    title: string;
    marketplace: { name: string };
    url: string | null;
  };
};

export function RechecksList() {
  const [rechecks, setRechecks] = useState<RecheckRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRechecks();
  }, []);

  const loadRechecks = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/data-collection/rechecks");
      const data = await response.json();
      
      if (data.success) {
        setRechecks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load rechecks:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (recheckId: string, status: "completed" | "rejected") => {
    try {
      const response = await fetch(`/api/admin/data-collection/rechecks/${recheckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (data.success) {
        loadRechecks();
      }
    } catch (error) {
      console.error("Failed to update recheck:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      in_progress: { variant: "secondary", label: "In Progress" },
      completed: { variant: "default", label: "Completed" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (score: number) => {
    if (score >= 80) return <Badge variant="destructive">High</Badge>;
    if (score >= 50) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recheck Requests</CardTitle>
          <Button onClick={loadRechecks} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          User-submitted requests untuk recheck harga
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : rechecks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recheck requests
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rechecks.map((recheck) => (
                <TableRow key={recheck.id}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {recheck.offer.title}
                  </TableCell>
                  <TableCell className="capitalize">
                    {recheck.offer.marketplace.name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {recheck.reason || "No reason provided"}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(recheck.priority_score)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(recheck.status)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(recheck.requested_at), {
                      addSuffix: true,
                      locale: localeId,
                    })}
                  </TableCell>
                  <TableCell>
                    {recheck.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(recheck.id, "completed")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(recheck.id, "rejected")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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
