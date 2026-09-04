import type { Metadata } from "next";

/**
 * Central SEO configuration.
 *
 * Set NEXT_PUBLIC_SITE_URL in Vercel to the canonical production domain.
 * Everything below (canonicals, sitemap, OG tags, JSON-LD) derives from it,
 * so there is exactly one place to change the domain.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://jayree.io"
).replace(/\/$/, "");

export const SITE_NAME = "Roster";

export const DEFAULT_DESCRIPTION =
  "Hire photographers, videographers and editors, or find paid photo and video work. Shoots are split into milestones with fixed prices, and every payment is held in escrow until you approve the work.";

/**
 * Narrowing the marketplace to photo and video also narrows what we can
 * realistically rank for, in our favour. "Freelance marketplace" was never
 * winnable against Upwork and Fiverr; "wedding videographer in Kochi" is,
 * because the competition is individual studios rather than platforms with
 * domain authority in the 90s.
 *
 * These are head terms for the niche, deliberately intent-led. The city
 * and category pages carry the long tail.
 */
export const PRIMARY_KEYWORDS = [
  "hire freelance photographer",
  "hire freelance videographer",
  "freelance video editor",
  "wedding photographer booking",
  "product photography freelancer",
  "corporate video production freelance",
  "drone videographer hire",
  "photo retouching freelancer",
  "book a photographer online",
  "freelance photography jobs",
];

/** Category-level intent, used on the programmatic /projects/category pages. */
export const CATEGORY_KEYWORD_TEMPLATES = [
  "hire {category} freelancers",
  "freelance {category} projects",
  "{category} freelance jobs",
  "book {category} near me",
  "{category} rates india",
];

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
}

/**
 * Builds a complete, canonical-correct Metadata object for a page.
 * Always prefer this over hand-writing metadata so canonical/OG/Twitter
 * stay consistent site-wide.
 */
export function buildMetadata({
  title,
  description,
  path,
  keywords,
  noIndex = false,
  type = "website",
}: PageMetaInput): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    keywords: keywords?.length ? keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: type === "profile" ? "profile" : type,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        },
  };
}

/** Shorthand for private/workspace pages that must never be indexed. */
export function noIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false, nocache: true },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD structured data                                             */
/* ------------------------------------------------------------------ */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    sameAs: [] as string[],
  };
}

/** Enables the sitelinks search box in Google results. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/projects?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

interface JobPostingInput {
  id: string;
  title: string;
  description: string;
  postedAt: string | null;
  deadline: string | null;
  budget: number;
  clientName: string;
  locationPref: string;
  skills: string[];
}

/**
 * JobPosting schema — makes open projects eligible for Google's job
 * search results. Only emit this for genuinely open, publicly visible
 * projects; stale or closed postings violate Google's guidelines.
 */
export function jobPostingJsonLd(p: JobPostingInput) {
  const validThrough = p.deadline
    ? new Date(p.deadline).toISOString()
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: p.title,
    description: p.description,
    datePosted: p.postedAt ? new Date(p.postedAt).toISOString() : undefined,
    validThrough,
    employmentType: "CONTRACTOR",
    hiringOrganization: {
      "@type": "Organization",
      name: p.clientName,
      sameAs: SITE_URL,
    },
    jobLocationType: p.locationPref === "remote" ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements:
      p.locationPref === "remote" ? { "@type": "Country", name: "Worldwide" } : undefined,
    jobLocation:
      p.locationPref !== "remote"
        ? { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "IN" } }
        : undefined,
    baseSalary: p.budget
      ? {
          "@type": "MonetaryAmount",
          currency: "INR",
          value: { "@type": "QuantitativeValue", value: p.budget, unitText: "PROJECT" },
        }
      : undefined,
    skills: p.skills.join(", ") || undefined,
    directApply: true,
    url: `${SITE_URL}/projects/${p.id}`,
  };
}

interface PersonInput {
  id: string;
  name: string;
  headline: string | null;
  bio: string | null;
  skills: string[];
  avatarUrl: string | null;
  rating?: number;
  reviewCount?: number;
}

export function personJsonLd(p: PersonInput) {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    url: `${SITE_URL}/u/${p.id}`,
    jobTitle: p.headline || undefined,
    description: p.bio || undefined,
    knowsAbout: p.skills.length ? p.skills : undefined,
    image: p.avatarUrl || undefined,
  };
  // Only claim an aggregate rating when real reviews back it up.
  if (p.reviewCount && p.reviewCount > 0 && p.rating) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return base;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
