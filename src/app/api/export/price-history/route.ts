import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  // Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    // Get product details
    const { data: product } = await supabase
      .from("products")
      .select("name, slug")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get price history (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: history, error } = await supabase
      .from("price_history")
      .select(`
        price,
        recorded_at,
        marketplaces (
          display_name
        )
      `)
      .eq("product_id", productId)
      .gte("recorded_at", ninetyDaysAgo.toISOString().split("T")[0])
      .order("recorded_at", { ascending: false });

    if (error) {
      console.error("Price history export error:", error);
      return NextResponse.json({ error: "Failed to fetch price history" }, { status: 500 });
    }

    if (!history || history.length === 0) {
      return NextResponse.json({ error: "No price history available" }, { status: 404 });
    }

    // Format data for CSV
    const csvData = history.map((item) => {
      const marketplace = item.marketplaces as unknown as { display_name: string } | null;
      return {
        "Date": new Date(item.recorded_at).toLocaleDateString("id-ID"),
        "Marketplace": marketplace?.display_name || "",
        "Price (Rp)": item.price,
      };
    });

    // Convert to CSV
    const headers = Object.keys(csvData[0]);
    const csvRows = [headers.join(",")];
    
    for (const row of csvData) {
      const values = headers.map((header) => {
        const value = row[header as keyof typeof row];
        return String(value);
      });
      csvRows.push(values.join(","));
    }

    const csv = csvRows.join("\n");

    // Return CSV file
    const filename = `pricehunt-price-history-${product.slug}-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Export price history error:", err);
    return NextResponse.json(
      { error: "Failed to export price history" },
      { status: 500 }
    );
  }
}
