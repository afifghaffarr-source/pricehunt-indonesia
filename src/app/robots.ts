import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/settings"],
      },
      // AI crawlers: keep training access open for the public catalog pages
      // (helps with discovery) but block user-private areas.
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/settings"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/settings"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
