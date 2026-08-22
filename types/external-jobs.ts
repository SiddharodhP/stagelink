export type ExternalSource = "Remotive" | "ProductionHUB";

/**
 * A freelance/contract listing pulled live from an external board and shown
 * read-only, with an outbound link to apply at the source. These never enter
 * Roster's bidding/escrow system.
 *
 * Only genuinely freelance/contract work is surfaced — see the filters in
 * app/api/external-jobs/route.ts. Full-time roles are excluded on purpose.
 */
export interface ExternalJob {
  id: string;
  source: ExternalSource;
  sourceUrl: string; // source homepage, for the required attribution link
  position: string;
  company: string;
  companyLogo: string | null;
  tags: string[];
  location: string;
  salary: string | null; // free-text; sources are inconsistent about format
  postedAt: string; // ISO
  applyUrl: string;
}

export interface ExternalJobsResponse {
  jobs: ExternalJob[];
  sources: { name: ExternalSource; url: string }[];
  fetchedAt: string;
}
