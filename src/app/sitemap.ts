import { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/app-url"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/deals`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ]

  // Fetch products for dynamic pages
  try {
    const supabase = await createClient()
    const { data: products, error } = await supabase
      .from("products")
      .select("slug, updated_at")
      .limit(1000) // Limit for sitemap performance
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Sitemap: Error fetching products:", error)
      return staticPages
    }

    const productPages: MetadataRoute.Sitemap =
      products?.map((product) => ({
        url: `${baseUrl}/product/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })) || []

    return [...staticPages, ...productPages]
  } catch (error) {
    console.error("Sitemap: Error generating sitemap:", error)
    return staticPages
  }
}
