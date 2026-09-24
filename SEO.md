# SEO — Keyword Research & Implementation

## An honest caveat on "search volume"

I don't have access to Google Keyword Planner, Ahrefs, or SEMrush, so **I cannot
give you real monthly search volumes**. Any specific number I invented would be
fake and worse than useless for planning.

What follows is grounded in things I *can* verify: what the incumbents actually
target (visible in their page titles, URL structures, and landing-page
architecture), established search-intent patterns, and your real category/skill
data pulled from your Supabase instance.

**Before spending money on content, validate volumes yourself** with the free
Google Keyword Planner (needs a Google Ads account, no spend required) or
Ubersuggest's free tier.

---

## The core strategic constraint

Your domain is brand new. Domain authority is effectively zero.

Upwork, Fiverr, and Freelancer.com have DA in the 90s, millions of backlinks,
and a decade of accumulated trust. **You cannot rank for head terms.** Targeting
these is throwing away effort:

| Term | Why it's unwinnable |
|---|---|
| `freelance marketplace` | Owned by Upwork/Fiverr, informational SERP |
| `hire freelancers` | Upwork spends heavily here, both ads and organic |
| `freelance website` | Dominated by listicles from high-DA blogs |
| `find freelancers online` | Same — incumbent + affiliate listicle territory |

The entire realistic strategy is **long-tail and differentiator-led**: phrases
with lower competition where your specific product angle (milestone escrow) is
the actual answer to the query.

---

## Keyword tiers

### Tier 1 — Differentiator keywords (your best shot)

These describe what makes Jayree different. Low volume, but low competition and
**very high intent** — someone searching this has been burned by non-payment
and is actively looking for a solution you literally provide.

- `milestone based freelance payments`
- `escrow protected freelance work`
- `hire freelancers with milestone payments`
- `pay freelancers per milestone`
- `freelance platform that protects payment`
- `safe freelance payment platform`
- `freelance escrow India`

**Where these are implemented:** homepage title/description, root metadata
keywords (`lib/seo.ts` → `PRIMARY_KEYWORDS`).

### Tier 2 — Category keywords (programmatic, highest leverage)

The classic marketplace SEO play: one landing page per category, each targeting
a predictable keyword pattern. You have **12 categories**, so this is 12
indexable pages from a single template.

Pattern per category:
- `hire {category} freelancers` ← primary, used as the H1
- `freelance {category} projects`
- `{category} freelance jobs`
- `find {category} freelancer online`
- `{category} freelancer with escrow payment`

Applied to your real categories:

| URL | Primary target |
|---|---|
| `/projects/category/web-development` | hire web development freelancers |
| `/projects/category/mobile-apps` | hire mobile apps freelancers |
| `/projects/category/design-creative` | hire design & creative freelancers |
| `/projects/category/writing-translation` | hire writing & translation freelancers |
| `/projects/category/digital-marketing` | hire digital marketing freelancers |
| `/projects/category/video-animation` | hire video & animation freelancers |
| `/projects/category/data-ai` | hire data & AI freelancers |
| `/projects/category/engineering-architecture` | hire engineering & architecture freelancers |
| `/projects/category/finance-accounting` | hire finance & accounting freelancers |
| `/projects/category/admin-support` | hire admin & support freelancers |
| `/projects/category/music-audio` | hire music & audio freelancers |
| `/projects/category/legal` | hire legal freelancers |

**Status: built and pre-rendered as static HTML.**

### Tier 3 — Skill long-tail (future expansion)

Your 48 seeded skills (React, Next.js, Figma, Shopify, SEO, Video Editing…)
map to the lowest-competition, highest-conversion tier:

- `hire {skill} freelancer` — e.g. "hire Shopify freelancer"
- `freelance {skill} developer` — e.g. "freelance React developer"
- `{skill} freelancer India`

**Not built yet.** Worth adding as `/projects/skill/[slug]` once you have real
projects — 48 more indexable pages. Deliberately deferred: skill pages with
zero listings are thin content and can hurt more than help.

### Tier 4 — Informational / content marketing

Ranks slower but builds topical authority and earns backlinks:

- `how to pay a freelancer safely`
- `what is milestone payment in freelancing`
- `how to compare freelancer bids`
- `freelance contract milestone template`
- `how to avoid freelancer non payment`

**Not built.** Needs a `/blog` section. Highest effort, slowest payoff, but the
only realistic route to earning links.

---

## What was implemented

### 1. Infrastructure

| File | Purpose |
|---|---|
| `lib/seo.ts` | Single source of truth: site URL, keyword sets, `buildMetadata()` helper, JSON-LD builders |
| `lib/seo-data.ts` | Server-side Supabase reads for metadata/structured data (uses anon key → RLS applies, so private rows can never leak into a meta tag) |
| `app/sitemap.ts` | Dynamic `sitemap.xml`, revalidates hourly |
| `app/robots.ts` | `robots.txt` with private-route disallows + sitemap pointer |
| `components/shared/json-ld.tsx` | Renders structured data server-side |

### 2. The problem this fixed

**Every page in the app was a client component**, and client components cannot
export `metadata`. Google was seeing the *identical* title and description on
all 26 pages — which is close to worst-case for SEO.

Fixed by adding server-component `layout.tsx` files alongside each page. The
client page is untouched; the layout supplies metadata.

### 3. Metadata coverage

- **Unique title + description + canonical** on every public page
- **`generateMetadata`** on dynamic routes (`/projects/[id]`, `/u/[id]`) using real DB content
- **Open Graph + Twitter cards** site-wide
- **`metadataBase`** set so all relative URLs resolve to the production domain

### 4. Structured data (JSON-LD)

| Schema | Where | Why |
|---|---|---|
| `Organization` + `WebSite` | Every page | Brand entity; `SearchAction` enables Google's sitelinks search box |
| `JobPosting` | `/projects/[id]` | **Makes open projects eligible for Google Jobs** — a separate, high-intent search surface the incumbents dominate but which is winnable per-listing |
| `Person` | `/u/[id]` (freelancers) | Rich profile results; `aggregateRating` only emitted when real reviews exist |
| `BreadcrumbList` | Project, profile, category pages | Breadcrumb display in results |
| `ItemList` | Category pages | Signals a genuine listing page |

### 5. Index hygiene

Deliberate `noindex` on: `/client/*`, `/freelancer/*`, `/admin/*`, `/messages`,
`/notifications`, `/settings/*`, `/contracts/*`, `/auth/*`, `/projects/new`.

Conditional `noindex` — the part most implementations get wrong:

- **Non-open projects** (awarded/completed/cancelled) are noindexed. An
  indexed dead listing is a soft-404 signal and drags down site quality.
- **Thin profiles** (no name, or no headline *and* no bio) are noindexed until
  they have real content.

---

## Submitting to Search Console

Your sitemap is live at **`https://jayree.io/sitemap.xml`** (note: XML, not XAML
— XAML is Microsoft's UI markup language, unrelated).

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property → **Domain** (`jayree.io`) → verify via DNS TXT record.
   Domain properties cover `www`, apex, http, and https in one go — better than
   a URL-prefix property here since you have a `www` → apex redirect.
   *(If you prefer HTML-tag verification, uncomment `verification.google` in
   `app/layout.tsx` and paste your token.)*
3. **Sitemaps** → submit `sitemap.xml`
4. **URL Inspection** → paste your homepage → *Request Indexing* (do the same
   for 2–3 category pages to prime discovery)
5. Repeat for [Bing Webmaster Tools](https://www.bing.com/webmasters) — it can
   import directly from Search Console, and Bing powers ChatGPT search results

**Verify the sitemap yourself first:** `curl https://jayree.io/sitemap.xml`

Currently it contains **22 URLs** (4 static + 12 categories + 6 profiles).
Project URLs appear automatically as projects are published.

---

## Realistic expectations

- **Weeks 1–2:** Google discovers and crawls; pages start appearing in the Index
  report. Little to no traffic.
- **Months 1–3:** Long-tail category pages begin surfacing for low-competition
  queries — *if* they have real project listings on them. Empty category pages
  will not rank.
- **Months 3–6:** Compounding, assuming steady real content.

**The binding constraint is not technical SEO — it's content.** Every category
page currently shows "No open projects right now". Google will not rank an
empty listing page, and `JobPosting` schema only helps when there are real
postings. Seeding genuine projects is the prerequisite for any of this working.

## Next SEO steps, ranked by leverage

1. **Get real projects posted** — unblocks everything above
2. **Skill landing pages** (`/projects/skill/[slug]`) — 48 more pages, once listings exist
3. **A blog** for Tier 4 informational terms and backlink acquisition
4. **An OG image** — `app/opengraph-image.tsx` for link previews on social/Slack
   (currently no image, so shares render bare)
