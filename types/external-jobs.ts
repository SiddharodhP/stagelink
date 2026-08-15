/**
 * Listings pulled live from an external job board (currently Remote OK)
 * and displayed read-only, with an outbound link to apply on the source
 * site. These never enter Roster's bidding/escrow system — they exist to
 * give visitors something real to browse on day one.
 */
export interface ExternalJob {
  id: string;
  source: "Remote OK";
  sourceUrl: string; // Remote OK's own homepage, for the required attribution link
  position: string;
  company: string;
  companyLogo: string | null;
  tags: string[];
  location: string;
  salaryMin: number;
  salaryMax: number;
  postedAt: string; // ISO date
  applyUrl: string; // deep link to the specific listing — where "booking" happens
}

export interface ExternalJobsResponse {
  jobs: ExternalJob[];
  source: string;
  sourceUrl: string;
  fetchedAt: string;
}
