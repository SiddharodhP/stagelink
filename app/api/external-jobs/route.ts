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
];

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

/* -------------------------------- Route -------------------------------- */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase().trim() || "";
  const tag = searchParams.get("tag")?.toLowerCase().trim() || "";

  // A slow/broken source must not take the page down — fetchers swallow
  // their own errors and return [].
  let jobs = await fetchRemotive();

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
