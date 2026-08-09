import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/deployment";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${site.replace(/\/$/, "")}/sitemap.xml` };
}
