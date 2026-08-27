import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private workspaces and auth flows carry no search value and can
        // expose per-user state — keep crawlers out entirely.
        disallow: [
          "/api/",
          "/admin",
          "/admin/",
          "/client/",
          // Trailing slash matters: this blocks the private /freelancer/
          // workspace WITHOUT touching the public /freelancers directory.
          "/freelancer/",
          "/contracts/",
          "/messages",
          "/notifications",
          "/settings/",
          "/invoices",
          "/invoices/",
          "/auth/",
          "/onboarding",
          "/projects/new",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
