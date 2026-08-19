import { ExternalJobsResponse } from "@/types/external-jobs";

const EMPTY: ExternalJobsResponse = {
  jobs: [],
  sources: [{ name: "Remotive", url: "https://remotive.com" }],
  fetchedAt: new Date().toISOString(),
};

export async function getExternalJobs(params?: { q?: string; tag?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.tag) qs.set("tag", params.tag);
  const url = `/api/external-jobs${qs.toString() ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { data: EMPTY, error: new Error(`HTTP ${res.status}`) };
    const data: ExternalJobsResponse = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: EMPTY, error: err as Error };
  }
}
