# jayree.io — Complete Project Description

A single self-contained account of what this project is, how it works, and what
state it is in. Accurate as of 14 October 2026 (commit `59647d3`, 30 migrations).

The repo also carries older, narrower docs — [README.md](README.md),
[OVERVIEW.md](OVERVIEW.md), [FEATURES_AND_USER_JOURNEYS.md](FEATURES_AND_USER_JOURNEYS.md),
[SEO.md](SEO.md), [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md) and
[WORK_LOG.md](WORK_LOG.md). Where they disagree with this file, they are stale:
each was written before one of the pivots described under *History* below.

---

## 1. What it is

A freelance marketplace for **photography, videography and post-production**,
built around one mechanic that general marketplaces do not have:

> A client posts a project with a stated budget. Freelancers bid. The client
> picks one — which opens a contract **and** a chat thread. Scope is discussed
> there, and only then does the client draft the work into **milestones**. The
> freelancer confirms that plan before starting. Each milestone is **funded into
> escrow up front** and released only when the client approves the deliverable.

The point of that ordering is that nobody can stage a shoot they have not
discussed. Milestones used to be invented at posting time, months before the
client met whoever would do the work; migration 018 moved them after the award.

Three roles: **client** (hires), **freelancer** (delivers), **admin**
(moderates, resolves disputes, sends payouts). The role is a one-time choice
after first login and is locked at the database level.

Currency is **INR only**. One currency means an amount needs no label to be
unambiguous, and totals are addition rather than a breakdown.

### Naming

Three names appear in the repo and all are current:

| Name | Where it is used |
|---|---|
| `jayree.io` | the wordmark — logo, page titles, metadata, legal footer |
| `Jayree` | the brand as an ordinary word, for prose (a lowercase domain cannot open a sentence) |
| `stagelink` | `package.json` `name` and the git remote only — a legacy name from two products ago |

Both live names come from [lib/constants.ts](lib/constants.ts) (`APP_NAME`,
`BRAND_NAME`); nothing hard-codes them.

### History (why the code has layers)

The same database has been three products. This explains most of the migration
list:

1. **Roster**, a musician-booking site. Migration 001 rebuilt it as a general
   freelance marketplace, mapping musicians to freelancers and organizers to
   clients and dropping the old tables.
2. **A general freelance marketplace.** Migration 016 narrowed it to photo,
   video and editing — the taxonomy still had Web Development sitting next to
   Photography, and a marketplace is judged by its narrowest useful promise.
3. **jayree.io**, the current product. Migration 026 took the old brand name out
   of stored invoice documents.

Currency went INR → per-project multi-currency (020–022) → USD-only (023) → INR
again (028), the last move because Razorpay settles in INR to an Indian entity
and what people see has to match the money that moves.

---

## 2. Status: what is real and what is not

| Area | State |
|---|---|
| Marketplace flow (post → bid → award → plan → deliver → approve) | complete, enforced in the database |
| Client funding a milestone | **real money**, through Razorpay Checkout, confirmed by a signature-verified webhook |
| Releasing to the freelancer | real decision, recorded as a `release` ledger row — the amount is owed and no longer refundable |
| Paying the freelancer out | a `payouts` row that is honestly `pending` until an admin sends the transfer by hand and records the reference. **No automated bank transfer.** |
| Invoices, retainers, overdue chasing | implemented, including a daily Vercel cron |
| Video calls | implemented, 8x8 JaaS inside the messages page |
| Disputes | implemented; an admin releases or refunds escrow |
| Admin account | none exists yet; promote one with SQL (§10) |
| Automated tests | none |

The honest summary of the money path: **funding is real, releasing is real,
paying out is manual.** Migration 030 exists precisely because conflating
"earned" with "paid" is how a marketplace ends up unable to answer *where is my
money*.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6, App Router, Turbopack dev server |
| Language | TypeScript, React 19.2 |
| Styling | Tailwind CSS v4 (`@theme inline`), Framer Motion for motion |
| UI primitives | Radix, Lucide icons, Sonner toasts |
| Backend | Supabase — PostgreSQL, Row Level Security, Realtime, Storage |
| Auth | Supabase Auth: Google OAuth + magic link |
| Payments | Razorpay (Checkout + webhooks) |
| Email | Nodemailer over Gmail SMTP |
| PDFs | `@react-pdf/renderer` (invoice documents) |
| Video | 8x8 JaaS, JWTs signed server-side with `jose` |
| Hosting | Vercel, with one daily cron |

Note the Next.js 16 rename: **middleware is [proxy.ts](proxy.ts)** at the repo
root, and it exports `proxy`, not `middleware`. Read the guides in
`node_modules/next/dist/docs/` before writing framework code — this version has
breaking changes from earlier ones.

---

## 4. The lifecycle, end to end

```
CLIENT                                       FREELANCER
  |
  +- posts a project (budget, skills, no milestones yet)
  |        status: draft -> open
  |                                              |
  |                                              +- browses /projects, filters,
  |                                              |  saves, then bids: amount,
  |                                              |  delivery days, a private
  |                                              |  proposal + a PUBLIC note
  |
  +- compares bids side by side, shortlists
  +- accepts one  ------------------------------> every other live bid is
  |        contract: pending_acceptance           auto-rejected
  |        a chat thread opens automatically
  |
  +- discusses scope in the thread <-----------> discusses scope
  +- drafts the milestones on the contract
  +- sends the plan  ---------------------------> confirms or DECLINES the
  |        contract: active                    |  whole milestone structure
  |                                            |
  +- funds milestone 1 via Razorpay            |
  |        money leaves the client's account   |
  |        webhook flips escrow_funded         |
  |        milestone: pending -> in_progress --> does the work, submits a
  |                                            |  note + optional file
  |                                            |  milestone: submitted
  +- reviews it:                               |
  |    approve  -> release; milestone: paid    |
  |                a pending payout opens -----> sees it owed in
  |    revise   -> revision_requested ---------> /settings/payouts
  |    dispute  -> frozen, admins alerted      |
  |                                            |
  |   ... repeat per milestone ...             |
  |                                            |
  |  final approval auto-completes the contract
  +- leaves a review <------------------------> leaves a review
                                               |
ADMIN -----------------------------------------+
  sends the bank/UPI transfer, records the reference -> payout: paid
```

State machines, enforced by **database triggers rather than app code**:

- **Project**: `draft → open → awarded → in_progress → completed | cancelled`
- **Bid**: `submitted → shortlisted → accepted | rejected | withdrawn`
- **Contract**: `pending_acceptance → active → completed | cancelled | declined`
- **Milestone**: `pending → in_progress → submitted → revision_requested ⇄ submitted → paid`, plus `disputed` / `cancelled`
- **Invoice**: `sent → acknowledged → paid | cancelled`
- **Payout**: `pending → processing → paid | failed`

---

## 5. Money

### Escrow as an append-only ledger

`transactions` is the ledger. `type` is one of `escrow_fund` (client →
platform), `release` (platform → freelancer), `refund` (platform → client). The
table has **no insert, update or delete policy at all** — it is written only
inside `SECURITY DEFINER` functions. Payment state is never accepted from a
client.

Milestones must be funded **in sequence**: milestone 2 cannot be funded while
milestone 1 is unsettled.

### Funding, with Razorpay (migration 029, [lib/razorpay.ts](lib/razorpay.ts))

Two halves, because the browser cannot be trusted to say a milestone is funded:

- `POST /api/razorpay/order` → `razorpay_begin_funding`. The amount is **not**
  taken from the request body; it is read from the milestone row. The database
  re-checks that this user is the client on an active contract, that the
  milestone is still pending, and that no earlier milestone is unsettled. It
  records the order id and nothing else.
- `POST /api/razorpay/webhook` → `razorpay_confirm_funding`. The **only** thing
  that may mark a milestone funded. It reads the raw body (re-serialising a
  parsed object changes the bytes the signature covers), verifies the HMAC with
  `timingSafeEqual`, claims the event id in `payment_events` first so retries
  are harmless, and answers 200 to work it has already done rather than sending
  Razorpay into hours of retrying.

Razorpay deals in paise; everything stored here is whole rupees. The ×100
conversion happens in one place, `toPaise` / `fromPaise`, rather than at each
call site where a missing multiplication would undercharge by a factor of a
hundred.

Checkout's success callback hands the browser a payment id. That is treated as a
hint, not proof.

### Release vs payout (migration 030, [lib/services/payouts.ts](lib/services/payouts.ts))

Two different events, deliberately not conflated:

- **RELEASE** — the client approved. The amount is owed to the freelancer and is
  no longer refundable to the client. A decision.
- **PAYOUT** — the money actually reached a bank account or UPI id. A transfer,
  and it happens later.

`approve_milestone` releases *and* opens a `pending` payout. An admin works the
queue at `/admin/payouts`, sends the money, and records the reference; the
freelancer watches the same figures at `/settings/payouts`.

Payout destinations live in their own table, `payout_accounts`, not as columns on
`profiles` — `profiles` is read publicly, and bank details must not be one stray
`select *` away from a response body. The account number is never rendered back
after saving.

A payout carries a provider name and a reference, so a hand-made transfer and a
future automated one are the same shape; swapping them changes nothing above
that file.

### Invoices and retainers

Two documents that look alike and move money completely differently:

- **Milestone invoice** (migration 004). The freelancer delivers, then invoices
  in one click. Paying it **delegates to `approve_milestone`** rather than
  re-implementing the release, so escrow, ledger rows, contract completion and
  notifications cannot drift between the two entry points.
- **Recurring invoice / retainer** (migration 009). Nothing is pre-funded, so the
  client is asked for new money each period — weekly, fortnightly or monthly. It
  gets its own settlement path, writing **two** ledger rows (client → platform,
  platform → freelancer) so the platform stays the auditable mediator. A schedule
  starts `pending_approval` and bills nothing until the client accepts; without
  that, a freelancer could point recurring billing plus daily overdue email at
  someone who never agreed to a retainer.

`GET /api/cron/invoices` runs daily at 04:00 UTC ([vercel.json](vercel.json)),
issues due retainer invoices and chases overdue ones by email. It authorises on a
bearer `CRON_SECRET` and uses the service-role key, so both are server-only.

---

## 6. Data model

Full schema across [supabase/migrations/](supabase/migrations/) — 30 files,
~78 functions, 26 live tables, no views.

| Group | Tables |
|---|---|
| People | `profiles`, `payout_accounts`, `portfolio_items`, `cities` |
| Taxonomy | `categories`, `skills` |
| Work | `projects`, `project_attachments`, `project_comments`, `milestones`, `bids`, `saved_projects` |
| Agreements | `contracts`, `milestone_submissions` |
| Money | `transactions`, `payouts`, `payment_events`, `invoices`, `recurring_invoices` |
| Trust | `reviews`, `disputes`, `reports` |
| Comms | `conversations`, `messages`, `notifications`, `call_sessions` |

Shared TypeScript shapes live in [types/marketplace.ts](types/marketplace.ts) and
[types/external-jobs.ts](types/external-jobs.ts).

Three modelling decisions worth knowing:

- **Reputation and financial aggregates are denormalised columns on `profiles`**
  (`avg_rating`, `total_reviews`, `total_earned`, `total_spent`), maintained by
  triggers. They were Postgres views, but a view runs with its creator's
  permissions and so bypassed RLS on `transactions`; migration 003 removed them.
  There are **no SECURITY DEFINER views** in the schema, by rule.
- **Cities are structured, not free text.** `profiles.location` as free text made
  "Bangalore", "bangalore" and "Bengaluru" three different places, which makes a
  local-work directory useless. 34,124 GeoNames cities across 244 countries are
  loaded by [scripts/seed-cities.mjs](scripts/seed-cities.mjs) rather than seeded
  in SQL (3MB of INSERTs is miserable to paste and impossible to re-run cleanly),
  with `search_cities()` for typeahead and `get_or_create_city()` for the long
  tail.
- **A bid is private; its note is public** (migration 017). `bids.proposal` and
  `bids.amount` stay readable only by the bidder and the client. A separate
  column holds a short note the freelancer knowingly writes for public view,
  shown as a comment on the project. Publishing the pitch and the number would
  import the problem bids are private to avoid: a late bidder who can read
  earlier proposals undercuts them, which pushes prices down and rewards bidding
  last.

---

## 7. Security model

Four layers, each sufficient on its own for what it covers.

**1. Database authorization.** Every sensitive transition runs through a
`SECURITY DEFINER` RPC that checks `auth.uid()` itself: `accept_bid`,
`respond_contract`, `razorpay_begin_funding`, `razorpay_confirm_funding`,
`submit_milestone`, `approve_milestone`, `request_revision`, `open_dispute`,
`resolve_dispute`, `cancel_contract`, `create_review`, `create_invoice`,
`pay_invoice`, the recurring-invoice set, and the payout set.

Every one calls `require_auth()` first. Without it, a NULL `auth.uid()` made
ownership checks like `client_id <> auth.uid()` evaluate to NULL rather than
TRUE, so the guard silently passed — fixed in migration 002, and the reason that
call is mandatory rather than stylistic.

**2. Row Level Security on every table**, plus guard triggers. An `in_rpc()`
flag lets triggers reject raw status updates on projects, bids and milestones
that try to bypass the RPCs. `guard_profile_update` blocks self-verification,
self-unsuspension and role escalation to admin. `reviews` is read-only to
clients; inserts go through `create_review`. Billing columns on `profiles` are
privilege-restricted (migrations 011 and 013) because `profiles_read_all` is
`using (true)` — without that, `billing_email`, `phone`, `tax_id` and
`billing_address` came back for every user via the public anon key.

**3. Route protection** in [proxy.ts](proxy.ts) for `/client`, `/freelancer`,
`/admin`, `/messages`, `/notifications`, `/contracts`, `/settings`, `/invoices`,
`/onboarding` and `/projects/new`, plus `WorkspaceShell` enforcing the correct
role client-side. Neither is load-bearing for data access — RLS is.

**4. Key hygiene.** [lib/supabase/client.ts](lib/supabase/client.ts) reads the
`role` claim out of `NEXT_PUBLIC_SUPABASE_ANON_KEY` and **refuses to boot in
production** if it finds a `service_role` key, shouting loudly in development
instead. Anything `NEXT_PUBLIC_` is compiled into the browser bundle; the two
keys are long opaque JWTs sitting next to each other in the dashboard, so pasting
the wrong one is easy and silent, and it would hand every visitor RLS-free access
to the functions that move money. In development the louder problem is that a
browser holding a service_role key bypasses RLS, so no policy the app appears to
enforce is actually being exercised.

Secrets that must **never** take a `NEXT_PUBLIC_` prefix: the service-role key,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GMAIL_APP_PASSWORD`,
`JAAS_PRIVATE_KEY`, `CRON_SECRET`.

---

## 8. Features by role

### Everyone
Google OAuth / magic-link sign-in · one-time role choice · guided profile
onboarding · public profiles at `/u/[id]` with reviews, portfolio and reputation
· two-way reviews, one per contract, enforced in the database · real-time
messaging over Supabase Realtime, optionally tied to a project · embedded video
calls · live notification bell and page, every alert deep-linking to the page it
is about · report a user · dark theme by default with a light opt-in.

### Client
Post a project (basics → skills and scope → review; milestones come later) ·
drafts · bid comparison side by side on price, delivery, rating, review count,
skills and proposal, sortable, with a lowest-bid label that never auto-wins ·
shortlisting · award, which auto-rejects the rest and opens both the contract and
the chat thread · draft and send the milestone plan · fund milestones through
Razorpay · approve, request a revision, or dispute a submission · pay invoices
and approve retainers · cancel a contract, where unfinished funded milestones are
refunded · payments ledger with funded / in-escrow / refunded totals.

### Freelancer
Discovery with filters (category, skill, budget bracket, experience level,
competition level) and sorts · save projects · bid with a private proposal and a
public note · edit or withdraw a live bid · confirm or decline the milestone plan
as a distinct step from being hired · submit deliverables with a note and a file ·
a combined `/freelancer/work` view of bids and contracts at every stage, showing
whose move it is · earnings ledger · payout account and what is owed · portfolio
with cover images, links and tagged skills · profile-completeness meter.

### Admin
Platform overview (users, projects, contracts, volume released, open disputes) ·
user management: verify, unverify, suspend, restore · dispute resolution,
releasing escrow or refunding with a required note visible to both parties ·
report review · the payout queue.

---

## 9. Routes

**Public** — `/` · `/projects` · `/projects/[id]` · `/projects/category/[slug]` ·
`/people` · `/people/[city]` · `/discover` · `/u/[id]` · `/login` ·
`/auth/role-select` · `/auth/callback` · plus `robots.ts` and `sitemap.ts`

**Client** — `/client/dashboard` · `/client/projects` · `/client/payments` ·
`/projects/new`

**Freelancer** — `/freelancer/dashboard` · `/freelancer/work` ·
`/freelancer/earnings` · `/freelancer/saved` · `/freelancer/portfolio`

**Any signed-in role** — `/contracts/[id]` · `/messages` · `/notifications` ·
`/invoices` · `/invoices/[id]` · `/invoices/recurring/[id]` ·
`/settings/profile` · `/settings/payouts` · `/onboarding`

**Admin** — `/admin` · `/admin/users` · `/admin/disputes` · `/admin/reports` ·
`/admin/payouts`

**API** — `/api/razorpay/order` · `/api/razorpay/webhook` ·
`/api/invoices/[id]/email` · `/api/cron/invoices` · `/api/calls/[id]/token` ·
`/api/external-jobs`

**Redirects** ([next.config.ts](next.config.ts)) — `/freelancers/*` → `/people/*`
as a 308, because those URLs were already in the sitemap and a 308 passes ranking
signal rather than leaving both URLs competing. `/client/contracts` →
`/client/projects` and `/freelancer/bids`, `/freelancer/contracts` →
`/freelancer/work` as 307s, because they are signed-in routes with nothing
indexed and a permanent redirect would be cached in browsers indefinitely.
`/freelancer/bids` has to keep working beyond bookmarks: the `bid_rejected`
notification wrote that path into rows already in the database. Legacy
`/creators`, `/musicians`, `/musician/*` and `/organizer/*` are redirected in
`proxy.ts`.

---

## 10. Running it

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run dev                    # http://localhost:3000
```

**Database.** Migrations are written here and **run by hand** in the Supabase SQL
editor, in numerical order; nothing applies them automatically. Each is a single
transaction, so a failure rolls back cleanly. Migration 001 is the big one: full
schema, triggers, RPCs, RLS, seeded categories and skills, and it migrates
existing `auth.users` rows into `profiles`. Then run
[scripts/seed-cities.mjs](scripts/seed-cities.mjs) for the city list.

**Give yourself admin** (no admin account exists yet):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

**Environment variables** — [.env.example](.env.example) has the annotated list.
Groups: Supabase URL and anon key (public); `SUPABASE_SERVICE_ROLE_KEY` and
`CRON_SECRET` (server-only, for the cron); `GMAIL_USER`, `GMAIL_APP_PASSWORD` and
`MAIL_FROM_NAME` (invoice email — the app password is a 16-character Google App
Password, not an account password); `JAAS_APP_ID`, `JAAS_API_KEY_ID` and
`JAAS_PRIVATE_KEY` (video, server-only); and Razorpay, where
`NEXT_PUBLIC_RAZORPAY_KEY_ID` is public because Checkout needs it in the browser
while `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are not.

`NEXT_PUBLIC_SITE_URL` names the site's own origin and is the single source for
canonicals, the sitemap, OG tags and JSON-LD. Its fallback is environment-aware,
so an unset variable still yields the real domain in production without localhost
ever emitting canonicals that point at the live site.

**Checks.** `npx tsc --noEmit` and `npm run lint`. There is no test suite.

---

## 11. Code layout

```
app/                     routes; one layout.tsx per segment carries the metadata
  api/                   razorpay (order, webhook) · invoice email · cron ·
                         JaaS token · external jobs
  globals.css            design tokens and both themes, ~500 lines
components/
  layout/                navbar · footer · sidebar · workspace shells · nav spotlight
  shared/                domain components — bid panel, bid comparison, milestone
                         planner/list, fund-milestone button, invoice PDF + UI,
                         payout and transaction lists, carousels, person/project
                         cards, video call, skill picker, city combobox, JSON-LD
  ui/                    Radix-based primitives
  theme/                 provider, pre-paint script, toggle
lib/
  services/              Supabase data access, one module per domain:
                         projects · bids · contracts · invoices ·
                         recurring-invoices · payouts · profiles · messaging ·
                         comments · calls · notifications · admin · auth ·
                         storage · external-jobs
  supabase/              client (browser, with the key guard) · server · admin
  emails/                invoice and overdue email bodies
  razorpay.ts            server-only client, paise conversion, webhook verification
  jaas.ts, mailer.ts     video tokens; SMTP
  seo.ts, seo-data.ts    metadata builders, JSON-LD, RLS-respecting SEO reads
  utils.ts, constants.ts formatPrice / CURRENCY_SYMBOL / amountInWords; brand,
                         nav, budget presets, status labels
  roles.ts               the two-colour role system
  project-status.ts,     "whose move is it" logic
  project-timeline.ts
  communities.ts, skills.ts
hooks/                   use-debounce · use-intersection
scripts/                 seed-cities.mjs · jaas-key.mjs · verify-jaas.mjs
supabase/migrations/     001 … 030, applied by hand
types/                   marketplace.ts · external-jobs.ts
proxy.ts                 route protection (Next.js 16's middleware)
```

---

## 12. Design system

Editorial and print-inspired, deliberately not a generic SaaS dashboard.

- **Type** — Fraunces (display serif) for headings and numbers, Instrument Sans
  for UI, Archivo where a geometric sans reads less like generated design.
- **Palette** — warm, not blue, because the photographs are graded warm and a
  cool grey theme would orphan every one of them. Persimmon is the single
  accent, at `#ef6230` on dark rather than `#d6440f`: the deeper shade is 3.6:1
  on that ground, fine behind white button text but short of AA as link text.
- **Surfaces** — hairline borders, no gradients, no glassmorphism. Motion is
  fade-up on scroll and one marquee.
- **Two themes, one set of tokens.** Every colour is declared twice — on `:root`
  (dark, the default) and on `html.light` — and the Tailwind theme points at
  those CSS variables rather than at hex. `@theme inline` bakes a *literal* into
  the utility, so `--color-card: #ffffff` compiled to a fixed white that no later
  redefinition could move; pointing the theme at `var(--card)` is what makes the
  value late-bound. Dark lives on `:root` rather than behind a class so a browser
  with JavaScript disabled still gets the intended default. Light is a class an
  inline pre-paint script adds, so a returning visitor who chose light never sees
  a dark frame first. Tailwind's stock `dark:` keys off `prefers-color-scheme`,
  which this site does not use, so `dark:` is redefined as `html:not(.light) &`
  and `light:` added as its opposite.
- **The two sides have colours** ([lib/roles.ts](lib/roles.ts)). Orange is the
  freelancer side, blue the client side, set by the homepage's two panels and
  reused everywhere a role appears, so colour becomes a reliable signal rather
  than decoration. Class names are written out in full — Tailwind scans source
  text, so `text-${role}` would compile to nothing.

---

## 13. Growth surfaces

- **Programmatic SEO** — per-category landing pages, per-city people pages,
  per-project and per-profile metadata, JSON-LD (`JobPosting` in INR,
  organisation, breadcrumbs), a dynamic hourly sitemap and `robots.ts`.
  [lib/seo-data.ts](lib/seo-data.ts) reads with the anon key so RLS applies — a
  draft project can never leak into a meta tag, and the sitemap never lists a URL
  a crawler would 403 on. Strategy and keyword tiers are in [SEO.md](SEO.md).
- **`/discover`** — read-only photo and video listings from ProductionHub's RSS,
  filtered hard to employment types that are genuinely freelance, cached 30
  minutes, each linking back to the source. Freelancer.com's API is deliberately
  **not** used: §4.7 of its terms forbids using the data to compete with their
  service, which is exactly what this is. Remote OK was removed because its feed
  has no employment-type field and its auto-generated tags mislabelled a military
  role as part-time contract work.
- **`/people`** — the public directory, by city and skill, ranked with
  completeness so empty profiles do not front it.
- **Communities** — a curated static list of places that post photo and video
  work ([lib/communities.ts](lib/communities.ts)). Static on purpose: Reddit's
  JSON API 403s without OAuth, its RSS rate-limits within seconds, and it blocks
  datacenter IP ranges, so a Vercel-hosted app cannot poll it reliably.

---

## 14. Conventions a contributor needs

- **Applied migrations are never edited.** A change to a shipped function goes in
  a new migration.
- **`CREATE OR REPLACE FUNCTION`, never `DROP` + `CREATE`.** Replace preserves
  privileges; drop silently discards them. Migration 015 learned this the
  expensive way, and `issue_recurring_invoice` is service_role-only *by grant* —
  dropping it would quietly open it to `anon`.
- **No SECURITY DEFINER views.** Anything public that needs an aggregate is a
  column on `profiles` under ordinary RLS.
- **Every RPC starts with `require_auth()`.**
- **One code path moves money.** Paying an invoice delegates to
  `approve_milestone`; it does not re-implement the release.
- **Money is formatted in one place.** `formatPrice`, `CURRENCY_SYMBOL` and
  `amountInWords` in [lib/utils.ts](lib/utils.ts); labels and budget brackets
  derive from them. Writing a currency sign into a string literal is how four
  filter labels kept saying dollars after the platform moved to rupees.
  `amountInWords` uses the Indian scale (crore / lakh) because it is the legal
  fallback when an invoice's numerals are disputed and has to agree with the
  grouped figure printed beside it.
- **Secrets never get a `NEXT_PUBLIC_` prefix** (see §7). The JaaS private key is
  not to be pasted into a conversation.
- Hard-won front-end details are recorded under *Decisions worth not relearning*
  in [WORK_LOG.md](WORK_LOG.md): `setPointerCapture` retargeting the following
  click, `100vw` being wider than the content box when a scrollbar exists,
  `next/image` keying optimisation on the URL, and others.

---

## 15. Known gaps

**Before a real launch**

- No admin account exists, so nothing can resolve a dispute or send a payout.
- Payouts are entirely manual — there is no automated bank or UPI transfer.
- `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` were recorded in
  [WORK_LOG.md](WORK_LOG.md) as not yet set on Vercel; until they are, the
  recurring-invoice and overdue-chase jobs do not run in production. Worth
  re-checking rather than trusting that note.
- Razorpay is wired against test keys. Going live needs live keys and a webhook
  registered at the production URL with a matching `RAZORPAY_WEBHOOK_SECRET`.
- No automated tests anywhere.

**Smaller**

- On mobile, the stacked benefit panel has a lot of empty space below its list.
- Two service-slider images are stand-ins, so two pictures appear twice in that
  section; prompts for the real ones are in Set G of
  [jayree-image-prompts.md](jayree-image-prompts.md). Sets C, D and E were
  written but never generated.
- `components/shared/craft-grid.tsx` is parked and renders nowhere.
- `sitemap-live.xml` in the repo root is an untracked, stale crawl artifact.
- `package.json` still reads `"name": "stagelink"`.
- [OVERVIEW.md](OVERVIEW.md) and
  [FEATURES_AND_USER_JOURNEYS.md](FEATURES_AND_USER_JOURNEYS.md) predate the
  milestone reordering, the currency moves, Razorpay, payouts, invoices, video
  calls and the route renames. Trust this file over them.
