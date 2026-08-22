import { NextRequest, NextResponse } from "next/server";
import {
  ExternalJob,
  ExternalJobsResponse,
  ExternalSource,
} from "@/types/external-jobs";

/**
 * Aggregates FREELANCE / CONTRACT listings from job boards whose terms permit
 * third-party display.
 *
 * Deliberately NOT used: Freelancer.com's API. Its data fits best (real
 * projects with budgets and bid counts) but §4.7 of their API T&Cs forbids
 * using it to "replicate or compete with the services offered by Freelancer",
 * which is exactly what Roster is. Using it would risk termination and hand a
 * competitor a legitimate complaint.
 *
 * Listings are filtered hard to employment types that are actually freelance
 * work — full-time roles are dropped.
 */

const REMOTIVE_API = "https://remotive.com/api/remote-jobs?limit=200";
const REMOTIVE_URL = "https://remotive.com";

const PRODUCTIONHUB_RSS = "https://www.productionhub.com/jobs/rss";
const PRODUCTIONHUB_URL = "https://www.productionhub.com";

const REVALIDATE_SECONDS = 1800; // 30 min
const MAX_RESULTS = 60;
const UA = "Roster-Marketplace (+https://jayree.io)";

/**
 * Remote OK was removed as a source. Its feed has no employment-type field,
 * only free-text tags that are auto-generated and unreliable — a military
 * "Infanteer" role and a "Facilities Planner" were both tagged as part-time
 * contract work, and the latter was also tagged "infosec, javascript". No
 * filter can rescue data that mislabelled, so quality beat quantity here.
 */
const SOURCES: { name: ExternalSource; url: string }[] = [
  { name: "Remotive", url: REMOTIVE_URL },
  { name: "ProductionHUB", url: PRODUCTIONHUB_URL },
];

/**
 * ProductionHUB is the only source measured to actually carry photo/video
 * work. Sampling one feed pull from each candidate:
 *
 *   Arbeitnow   1/175    Jobicy   0/50    The Muse  0/20
 *   Himalayas   0/20     Remotive 0/18    ProductionHUB 19/20
 *
 * General job boards are overwhelmingly remote tech roles, so they stay for
 * breadth while this carries the category the site is actually about.
 */
const PHOTO_VIDEO = new RegExp(
  [
    "photograph", "videograph", "cinematograph", "\\bvideo\\b", "\\bfilm\\b",
    "camera", "\\bphoto\\b", "director of photography", "\\bdp\\b",
    "motion graphic", "post production", "\\bediting\\b", "\\beditor\\b",
    "drone", "aerial", "broadcast", "\\bgaffer\\b", "lighting",
    "colorist", "\\bvfx\\b", "retouch", "content creator",
  ].join("|"),
  "i"
);

/* ------------------------------ Remotive ------------------------------- */

// Remotive exposes a real job_type field, so filtering here is exact.
const REMOTIVE_FREELANCE_TYPES = ["contract", "freelance", "part_time"];

interface RemotiveJob {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  company_logo?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
}

function fromRemotive(job: RemotiveJob): ExternalJob | null {
  if (!job.id || !job.title || !job.company_name) return null;
  if (!job.job_type || !REMOTIVE_FREELANCE_TYPES.includes(job.job_type)) return null;

  const tags = [job.category, ...(job.tags || [])].filter(Boolean) as string[];

  return {
    id: `rmv-${job.id}`,
    source: "Remotive",
    sourceUrl: REMOTIVE_URL,
    position: job.title.trim(),
    company: job.company_name.trim(),
    companyLogo: job.company_logo || null,
    tags: tags.slice(0, 6),
    location: job.candidate_required_location?.trim() || "Remote",
    salary: job.salary?.trim() || null,
    postedAt: job.publication_date || new Date().toISOString(),
    applyUrl: job.url || REMOTIVE_URL,
  };
}

/* ------------------------------ Fetchers ------------------------------- */

async function fetchRemotive(): Promise<ExternalJob[]> {
  try {
    const res = await fetch(REMOTIVE_API, {
      headers: { "User-Agent": UA },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const body = await res.json();
    return (body.jobs || [])
      .map(fromRemotive)
      .filter((j: ExternalJob | null): j is ExternalJob => j !== null);
  } catch {
    return [];
  }
}

/* --------------------------- ProductionHUB ----------------------------- */

/**
 * Minimal RSS reader. The feed is flat <item> elements with no namespacing
 * beyond a10:updated, so a full XML parser would be a dependency for no
 * benefit. Entities are decoded because titles carry &amp; and &#39;.
 */
function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function rssField(item: string, name: string) {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1]) : "";
}

/**
 * The feed carries no company field. Rather than invent one, we pull it out
 * only when the description opens with an unambiguous "<Name> is seeking"
 * and otherwise fall back to the category, which is always present and
 * accurate. A half-right company name on a job card is worse than none.
 */
function extractCompany(description: string) {
  const cleaned = description.replace(/^job summary:\s*/i, "").trim();
  const m = cleaned.match(
    /^([A-Z][\w&.,'’()\- ]{2,45}?)\s+is\s+(?:seeking|looking for|hiring|searching for)/
  );
  const name = m?.[1]?.trim();
  // Guard against sentences that merely start with a capital ("We are...").
  if (name && !/^(we|the|our|this|a|an|i)$/i.test(name.split(/\s+/)[0])) {
    return name;
  }
  // In practice most descriptions lead with the role, not the company, so
  // this is the common path. Naming the board beats repeating the category
  // that the tags already carry.
  return "ProductionHUB listing";
}

function fromProductionHub(item: string): ExternalJob | null {
  const title = rssField(item, "title");
  const link = rssField(item, "link") || rssField(item, "guid");
  if (!title || !link) return null;

  const category = rssField(item, "category");
  const description = rssField(item, "description").replace(/\s+/g, " ");

  // Match the TITLE only. Testing the category as well let every listing in
  // a film category through whatever the actual role was — set designers,
  // makeup artists, audio engineers and construction BIM technicians all
  // slipped in. Title-only drops 20 -> 7, and those 7 are all camera work.
  if (!PHOTO_VIDEO.test(title)) return null;

  const idMatch = link.match(/\/job\/(\d+)/);

  return {
    id: `phb-${idMatch?.[1] || link.slice(-24)}`,
    source: "ProductionHUB",
    sourceUrl: PRODUCTIONHUB_URL,
    position: title,
    company: extractCompany(description),
    companyLogo: null,
    tags: category ? category.split(/\s*\/\s*/).slice(0, 4) : [],
    // The RSS omits location; the job page has it. Saying so beats guessing.
    location: "See listing",
    salary: null,
    postedAt: rssField(item, "a10:updated") || new Date().toISOString(),
    applyUrl: link,
  };
}

async function fetchProductionHub(): Promise<ExternalJob[]> {
  try {
    const res = await fetch(PRODUCTIONHUB_RSS, {
      headers: { "User-Agent": UA },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    return items
      .map(fromProductionHub)
      .filter((j): j is ExternalJob => j !== null);
  } catch {
    return [];
  }
}

/* -------------------------------- Route -------------------------------- */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase().trim() || "";
  const tag = searchParams.get("tag")?.toLowerCase().trim() || "";

  // A slow/broken source must not take the page down — fetchers swallow
  // their own errors and return [].
  const results = await Promise.all([fetchProductionHub(), fetchRemotive()]);
  let jobs = results.flat();

  // Guards against the same role appearing twice, and keeps the shape ready
  // for a second source being added back later.
  const seen = new Set<string>();
  jobs = jobs.filter((j) => {
    const key = `${j.company.toLowerCase()}::${j.position.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (q) {
    jobs = jobs.filter(
      (j) =>
        j.position.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (tag) {
    jobs = jobs.filter((j) => j.tags.some((t) => t.toLowerCase().includes(tag)));
  }

  jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  const body: ExternalJobsResponse = {
    jobs: jobs.slice(0, MAX_RESULTS),
    sources: SOURCES,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
