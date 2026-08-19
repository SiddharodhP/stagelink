/**
 * Curated places where clients post freelance work, weighted toward
 * photography and videography.
 *
 * Deliberately a static list rather than a live feed. Reddit's JSON API
 * returns 403 without OAuth, its RSS feeds rate-limit within seconds, and
 * Reddit blocks datacenter IP ranges — so a Vercel-hosted app cannot poll
 * them reliably. Curated links always work and never break in production.
 *
 * Every URL below was checked to resolve (HTTP 200) when this list was
 * written. If one 404s later, remove it — a dead link is worse than none.
 */

export type CommunityPlatform = "Reddit" | "Job board" | "Network";
export type CommunityFocus = "photo" | "video" | "both" | "general";

export interface Community {
  name: string;
  url: string;
  platform: CommunityPlatform;
  focus: CommunityFocus;
  /** What you'd actually find there, and how to search it. */
  description: string;
  /** Optional practical tip for finding paid work specifically. */
  tip?: string;
}

export const COMMUNITIES: Community[] = [
  /* ---------- Photography ---------- */
  {
    name: "r/HireaPhotographer",
    url: "https://www.reddit.com/r/HireaPhotographer/",
    platform: "Reddit",
    focus: "photo",
    description:
      "Clients posting paid photography jobs — events, portraits, product shoots.",
    tip: "Sort by New and reply fast; good briefs get claimed within hours.",
  },
  {
    name: "r/WeddingPhotography",
    url: "https://www.reddit.com/r/WeddingPhotography/",
    platform: "Reddit",
    focus: "photo",
    description:
      "Wedding photographers and couples. Second-shooter calls appear regularly.",
    tip: "Search “second shooter” plus your city.",
  },
  {
    name: "Behance Job List",
    url: "https://www.behance.net/joblist",
    platform: "Job board",
    focus: "both",
    description:
      "Adobe's creative job board — photography, video, and design roles including freelance.",
    tip: "Filter to Freelance and your discipline.",
  },

  /* ---------- Videography / film ---------- */
  {
    name: "r/VideoEditingRequests",
    url: "https://www.reddit.com/r/VideoEditingRequests/",
    platform: "Reddit",
    focus: "video",
    description:
      "People actively looking to pay someone to edit video. One of the highest hire-intent subs.",
    tip: "Posts tagged [PAID] are the ones worth answering.",
  },
  {
    name: "r/videography",
    url: "https://www.reddit.com/r/videography/",
    platform: "Reddit",
    focus: "video",
    description:
      "Working videographers. Gig posts and referrals alongside gear and technique threads.",
  },
  {
    name: "r/editors",
    url: "https://www.reddit.com/r/editors/",
    platform: "Reddit",
    focus: "video",
    description:
      "Professional post-production community. Paid work and industry rate discussion.",
  },
  {
    name: "r/Filmmakers",
    url: "https://www.reddit.com/r/Filmmakers/",
    platform: "Reddit",
    focus: "video",
    description:
      "Film and commercial production. Crew calls for shooters, editors, and colourists.",
  },
  {
    name: "ProductionHUB",
    url: "https://www.productionhub.com",
    platform: "Job board",
    focus: "video",
    description:
      "Film, video, and production crew marketplace — one of the largest for camera and post roles.",
  },
  {
    name: "Mandy",
    url: "https://www.mandy.com",
    platform: "Job board",
    focus: "video",
    description:
      "Film and TV crew jobs worldwide, including freelance camera and editing work.",
  },
  {
    name: "Backstage",
    url: "https://www.backstage.com",
    platform: "Job board",
    focus: "both",
    description:
      "Casting plus crew calls — photographers and videographers for shoots and productions.",
  },
  {
    name: "Stage 32",
    url: "https://www.stage32.com",
    platform: "Network",
    focus: "video",
    description:
      "Film industry network with a jobs board covering production and post-production.",
  },

  /* ---------- General freelance ---------- */
  {
    name: "r/forhire",
    url: "https://www.reddit.com/r/forhire/",
    platform: "Reddit",
    focus: "general",
    description:
      "The largest general freelance board on Reddit — every discipline, all budgets.",
    tip: "Filter to posts tagged [Hiring]; [For Hire] posts are freelancers advertising.",
  },
];

export const FOCUS_LABEL: Record<CommunityFocus, string> = {
  photo: "Photography",
  video: "Video & film",
  both: "Photo & video",
  general: "All freelance",
};
