import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";
import { getAppUrl } from "@/lib/app-url";

export async function GET(_request: NextRequest) {
  // Require authentication
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get wishlist with product details
    const { data: wishlist, error } = await supabase
      .from("wishlists")
      .select(`
        created_at,
        products (
          name,
          category,
          lowest_price,
          highest_price,
          average_price,
          deal_score,
          slug
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Wishlist export error:", error);
      return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
    }

    if (!wishlist || wishlist.length === 0) {
      return NextResponse.json({ error: "No items in wishlist" }, { status: 404 });
    }

    // Format data for CSV
    const csvData = wishlist.map((item) => {
      const product = item.products as unknown as { 
        name: string; 
        category: string; 
        lowest_price: number; 
        highest_price: number; 
        average_price: number; 
        deal_score: number; 
        slug: string 
      } | null;
      return {
        "Product Name": product?.name || "",
        "Category": product?.category || "",
        "Lowest Price": product?.lowest_price || 0,
        "Highest Price": product?.highest_price || 0,
        "Average Price": product?.average_price || 0,
        "Deal Score": product?.deal_score || 0,
        "Added Date": new Date(item.created_at).toLocaleDateString("id-ID"),
        "URL": `${getAppUrl()}/product/${product?.slug}`,
      };
    });

    // Convert to CSV
    const headers = Object.keys(csvData[0]);
    const csvRows = [headers.join(",")];
    
    for (const row of csvData) {
      const values = headers.map((header) => {
        const value = row[header as keyof typeof row];
        // Escape commas and quotes
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(","));
    }

    const csv = csvRows.join("\n");

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="bijakbeli-wishlist-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export wishlist error:", err);
    return NextResponse.json(
      { error: "Failed to export wishlist" },
      { status: 500 }
    );
  }
}
