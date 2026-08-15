import { NextRequest, NextResponse } from "next/server";
import { ExternalJob, ExternalJobsResponse } from "@/types/external-jobs";

// Remote OK's terms require crediting them and linking back with a followed
// link, in exchange for free, unauthenticated access to this feed. See:
// https://remoteok.com/api (first array element carries the terms notice).
const REMOTEOK_API = "https://remoteok.com/api";
const REMOTEOK_URL = "https://remoteok.com";

// Cache server-side for 30 minutes — keeps listings fresh without hammering
// their API on every visitor.
const REVALIDATE_SECONDS = 1800;
const MAX_RESULTS = 60;

interface RemoteOkJob {
  id?: string;
  position?: string;
  company?: string;
  company_logo?: string;
  logo?: string;
  tags?: string[];
  location?: string;
  salary_min?: number;
  salary_max?: number;
  date?: string;
  apply_url?: string;
  url?: string;
}

function normalize(job: RemoteOkJob): ExternalJob | null {
  if (!job.id || !job.position || !job.company) return null;
  return {
    id: job.id,
    source: "Remote OK",
    sourceUrl: REMOTEOK_URL,
    position: job.position,
    company: job.company,
    companyLogo: job.logo || job.company_logo || null,
    tags: Array.isArray(job.tags) ? job.tags.slice(0, 6) : [],
    location: job.location?.trim() || "Remote",
    salaryMin: job.salary_min || 0,
    salaryMax: job.salary_max || 0,
    postedAt: job.date || new Date().toISOString(),
    applyUrl: job.apply_url || job.url || REMOTEOK_URL,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase().trim() || "";
  const tag = searchParams.get("tag")?.toLowerCase().trim() || "";

  let res: Response;
  try {
    res = await fetch(REMOTEOK_API, {
      headers: {
        // A descriptive UA is a Remote OK-documented courtesy for API consumers.
        "User-Agent": "Roster-Marketplace (+https://roster.app)",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch {
    return NextResponse.json(
      { jobs: [], source: "Remote OK", sourceUrl: REMOTEOK_URL, fetchedAt: new Date().toISOString() } satisfies ExternalJobsResponse,
      { status: 200 } // degrade gracefully — the page shows an empty state, not a crash
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { jobs: [], source: "Remote OK", sourceUrl: REMOTEOK_URL, fetchedAt: new Date().toISOString() } satisfies ExternalJobsResponse,
      { status: 200 }
    );
  }

  const raw: RemoteOkJob[] = await res.json();
  // First element of Remote OK's payload is a legal/terms notice, not a job.
  let jobs = raw.slice(1).map(normalize).filter((j): j is ExternalJob => j !== null);

  if (q) {
    jobs = jobs.filter(
      (j) =>
        j.position.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (tag) {
    jobs = jobs.filter((j) => j.tags.some((t) => t.toLowerCase() === tag));
  }

  const body: ExternalJobsResponse = {
    jobs: jobs.slice(0, MAX_RESULTS),
    source: "Remote OK",
    sourceUrl: REMOTEOK_URL,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
