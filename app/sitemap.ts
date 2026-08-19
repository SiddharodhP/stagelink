import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";

// Rebuild the sitemap hourly so newly posted projects get discovered quickly.
export const revalidate = 3600;

/**
 * Dynamic sitemap: static marketing pages + every category landing page +
 * every open project + every public profile.
 *
 * Uses the anon key, so RLS applies — only rows the public can actually
 * see end up here. That's the correct behaviour: never list a URL a
 * crawler would get a 404/403 on.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/discover`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return staticRoutes;

  try {
    const supabase = createClient(url, key);

    const [categories, projects, profiles] = await Promise.all([
      supabase.from("categories").select("slug"),
      supabase
        .from("projects")
        .select("id, updated_at, published_at")
        .eq("status", "open")
        .order("published_at", { ascending: false })
        .limit(5000),
      supabase
        .from("profiles")
        .select("id, updated_at")
        .not("role", "is", null)
        .limit(5000),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = (categories.data || []).map((c) => ({
      url: `${SITE_URL}/projects/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    const projectRoutes: MetadataRoute.Sitemap = (projects.data || []).map((p) => ({
      url: `${SITE_URL}/projects/${p.id}`,
      lastModified: new Date(p.updated_at || p.published_at || now),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const profileRoutes: MetadataRoute.Sitemap = (profiles.data || []).map((p) => ({
      url: `${SITE_URL}/u/${p.id}`,
      lastModified: new Date(p.updated_at || now),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

    return [...staticRoutes, ...categoryRoutes, ...projectRoutes, ...profileRoutes];
  } catch {
    // Never let a DB hiccup break the sitemap entirely.
    return staticRoutes;
  }
}
