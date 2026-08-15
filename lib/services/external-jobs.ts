import { ExternalJobsResponse } from "@/types/external-jobs";

export async function getExternalJobs(params?: { q?: string; tag?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.tag) qs.set("tag", params.tag);
  const url = `/api/external-jobs${qs.toString() ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url);
    const data: ExternalJobsResponse = await res.json();
    return { data, error: null };
  } catch (err) {
    return {
      data: { jobs: [], source: "Remote OK", sourceUrl: "https://remoteok.com", fetchedAt: new Date().toISOString() } as ExternalJobsResponse,
      error: err as Error,
    };
  }
}
