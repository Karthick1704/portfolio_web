import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://karthick1704.github.io/portfolio_web/";
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${site.replace(/\/$/, "")}/sitemap.xml` };
}
