# jayree.io — Features & User Journeys

A complete feature inventory and page-by-page walkthrough of both the client
and freelancer experience.

---

## Part 1 — Feature List

### Accounts & Onboarding

| Feature | What it does |
|---|---|
| **Google OAuth / magic-link login** | Sign in with a Google account or a passwordless email link — no separate password to manage. |
| **Role selection (Client / Freelancer)** | A one-time choice made right after first login that determines which workspace, sidebar, and permissions the account gets. Locked at the database level once set. |
| **Profile onboarding** | A guided version of Settings → Profile shown immediately after role selection, so a new account never lands on an empty dashboard without being nudged to fill itself in. |
| **Route protection (`proxy.ts`)** | Blocks anonymous visitors from every workspace route (`/client/*`, `/freelancer/*`, `/admin`, `/messages`, etc.) and redirects them to `/login`. |
| **Role-aware workspace shell** | Every logged-in page automatically shows the correct sidebar (client / freelancer / admin) and blocks a client from opening freelancer-only pages and vice versa. |

### Client-Side Features

| Feature | What it does |
|---|---|
| **4-step project creation wizard** | Basics → Skills & scope → Milestones → Review, with per-step validation so a project can't be published incomplete. |
| **Milestone builder** | Add/remove/reorder as many milestones as needed, each with its own title, description, deliverables, payment amount, and due date. Running budget total updates live. |
| **Draft projects** | A project can be saved without publishing, edited later, and published when ready. |
| **Project publishing** | Moves a project from `draft` → `open`; blocked server-side unless at least one milestone exists. |
| **My Projects list** | Tabbed view (All / Open / In progress / Drafts / Completed) with per-project bid counts and quick actions (publish draft, cancel, delete draft). |
| **Bid comparison view** | All bids on a project shown side by side with price, delivery time, freelancer rating, review count, skills, and full proposal text — sortable by recommended / price / rating / delivery speed, with a lowest-bid label that never auto-wins. |
| **Shortlisting** | Mark promising bids to revisit before making a final decision. |
| **Award / accept a bid** | Confirms the choice, creates the contract, and automatically rejects every other live bid on that project. |
| **Milestone funding (escrow)** | Client deposits a milestone's payment before the freelancer starts work on it; enforced in order — milestone 2 can't be funded while milestone 1 is unsettled. |
| **Milestone review & approval** | Approve a submitted milestone (releases escrow to the freelancer) or request a revision with a note. |
| **Dispute a milestone** | Escalates a milestone to admin review if something can't be resolved directly. |
| **Cancel a contract** | Either party can cancel; any escrowed-but-unpaid milestones are automatically refunded. |
| **Payments ledger** | Full history of every escrow deposit, release, and refund, with running totals (funded / held in escrow / refunded). |
| **Leave a review** | Rate and review the freelancer once a contract completes or is cancelled — one review per contract. |
| **Saved shortlist** *(freelancer-facing feature reused by client dashboards for consistency — see below)* | — |

### Freelancer-Side Features

| Feature | What it does |
|---|---|
| **Project discovery with filters** | Filter open projects by category, skill, budget range, experience level, and competition level (fewer bids); sort by newest, budget, deadline, or bid count. |
| **Save projects** | Bookmark a project to bid on later without losing track of it. |
| **Bid submission** | Propose a price, delivery time, and written proposal on any open project. |
| **Edit / withdraw a bid** | A live bid (submitted or shortlisted) can be edited or withdrawn before the client decides. |
| **My Bids dashboard** | Tabbed view (Live / Shortlisted / Won / Closed / All) with a computed win rate. |
| **Milestone-plan confirmation** | After being awarded a project, the freelancer must explicitly accept (or decline) the full milestone structure before any work begins — a distinct step from "being hired." |
| **Milestone delivery** | Submit a note and an optional file for any in-progress or revision-requested milestone. |
| **Contracts workspace** | Shows exactly whose turn it is next ("your move" vs "waiting on them"), the funded/paid status of every milestone, and overall contract progress as a percentage. |
| **Earnings ledger** | History of every payment received, with totals earned and average payment per milestone. |
| **Portfolio** | Upload titled, described work samples with a cover image, an optional live link, and tagged skills — shown on the freelancer's public profile. |
| **Skills & profile completeness** | A profile-strength meter (name, headline, bio, skills, photo) that nudges freelancers to finish setting up before they start bidding. |
| **Leave a review** | Rate and review the client once a contract ends. |

### Shared Features (both roles)

| Feature | What it does |
|---|---|
| **Contract / milestone workspace** | The shared page both sides use to fund, submit, approve, revise, dispute, and message about a specific contract. |
| **Real-time messaging** | Per-conversation chat, optionally tied to a specific project, with live delivery via Supabase Realtime, read/unread tracking, and a mobile-friendly list/thread layout. |
| **Notification bell + notifications page** | Live-updating alerts for every meaningful event — new bid, bid accepted/rejected, milestone funded/submitted/approved/revision-requested, payment released, review received, dispute opened/resolved, contract cancelled — each linking straight to the relevant page. |
| **Public profiles** | View any user's name, role, bio, skills (freelancers), portfolio (freelancers), rating, review history, and reputation stats. |
| **Two-way reviews** | Both sides rate each other after a contract ends; one review per person per contract, enforced by the database. |
| **Report a user** | File a report against another account for admin review. |
| **Verification badge** | A visible marker on profiles/cards for identity-confirmed accounts (admin-controlled, not self-service). |

### Admin Features

| Feature | What it does |
|---|---|
| **Platform overview** | At-a-glance stats: total users, projects posted, contracts, total volume released, and open disputes. |
| **User management** | Search/filter all accounts by role; verify, unverify, suspend, or restore any account. |
| **Dispute resolution** | Review an escalated milestone dispute and resolve it by releasing escrow to the freelancer or refunding the client, with a required resolution note visible to both parties. |
| **Report review** | View submitted user reports and act on them (suspend the reported account or close the report). |

### Platform-Level / Trust & Safety Mechanics

| Feature | What it does |
|---|---|
| **Milestone-based escrow** | Money is never held for the whole project at once — it moves milestone by milestone, funded before work starts and released only after approval. |
| **Server-enforced state machines** | Project, bid, contract, and milestone statuses can only move through valid transitions (e.g. a milestone can't be "approved" before it was "submitted") — enforced by database triggers, not just UI logic. |
| **Authorization at the database layer** | Every sensitive action (accept a bid, fund a milestone, approve a payment, resolve a dispute) runs through a database function that independently checks who's making the request — the frontend can't be tricked into bypassing it. |
| **Reputation as public data** | Average rating, review count, total earned, and total spent are visible on profiles as trust signals, kept accurate automatically whenever a review or payment happens. |

---

## Part 2 — Complete User Journeys

### A. Client Journey

```
1.  /                         Land on the homepage, read how milestone
                               escrow works, click "Get started"
2.  /login                    Sign in with Google or a magic link
3.  /auth/role-select          Choose "I'm hiring" (client)
4.  /settings/profile          (onboarding mode) Fill in name, location,
     ?onboarding=1             company name, website, bio → redirected to
                               the client dashboard
5.  /client/dashboard          See stats (open projects, bids received,
                               active contracts, total spent) and an
                               action queue if anything needs attention
6.  /projects/new              Post a project through the 4-step wizard:
                               Basics → Skills & scope → Milestones → Review
                               → Publish
7.  /client/projects           Track the new project's status; watch its
                               bid count rise
8.  /projects/[id]             Open the project to review incoming bids
                               in the Bid Comparison panel — shortlist a
                               few, compare price/rating/proposals
9.  /u/[id]                    (optional) Check a specific freelancer's
                               public profile, portfolio, and reviews
                               before deciding
10. /projects/[id]             Award the project to the chosen freelancer
                               (dialog confirms the price and milestone
                               count) → contract is created
11. /contracts/[id]            Wait for the freelancer to confirm the
                               milestone structure; once confirmed,
                               fund the first milestone
12. /messages                  Message the freelancer directly about
                               specifics (optional, ongoing throughout)
13. /contracts/[id]            When the freelancer submits a milestone,
                               review the deliverable → Approve (releases
                               payment) or Request a revision
                               … repeat funding → review → approve for
                               each remaining milestone …
14. /client/payments            Check the full escrow/release/refund
                               history at any point
15. /contracts/[id]            Once the final milestone is approved, the
                               contract auto-completes → leave a review
                               for the freelancer
16. /notifications              Catch up on any alerts missed along the way
                               (bid received, milestone submitted, etc.)
```

**Pages visited (client):** `/`, `/login`, `/auth/role-select`,
`/settings/profile`, `/client/dashboard`, `/projects/new`,
`/client/projects`, `/projects/[id]`, `/u/[id]`, `/contracts/[id]`,
`/messages`, `/client/payments`, `/client/contracts`, `/notifications`.

---

### B. Freelancer Journey

```
1.  /                         Land on the homepage, read the pitch for
                               freelancers, click "Get started"
2.  /login                    Sign in with Google or a magic link
3.  /auth/role-select          Choose "I'm freelancing"
4.  /settings/profile          (onboarding mode) Fill in name, headline,
     ?onboarding=1             bio, hourly rate, experience, availability,
                               and skills → redirected to the freelancer
                               dashboard
5.  /freelancer/dashboard      See a profile-completion nudge, stats
                               (live bids, active contracts, earnings,
                               rating), and recommended projects matched
                               to their skills
6.  /freelancer/portfolio      Add 2–3 portfolio pieces (title,
                               description, cover image, link, skills
                               used) to strengthen the profile
7.  /projects                  Browse open projects; filter by category,
                               skill, budget, experience level, and
                               competition; sort by newest/budget/deadline
8.  /projects/[id]             Open a project that fits — read the full
                               milestone breakdown, budget, and client's
                               profile card before bidding
9.  /projects/[id]             (heart icon) Save a couple of promising
                               projects to /freelancer/saved to bid on later
10. /projects/[id]             Submit a bid: price, delivery time, and a
                               written proposal
11. /freelancer/bids           Track bid status (Live / Shortlisted / Won
                               / Closed); edit or withdraw a bid if needed
12. /messages                  Respond if the client reaches out with
                               questions before deciding
13. /freelancer/dashboard       See "You were selected!" in the action
      or /contracts/[id]        queue → open the contract
14. /contracts/[id]            Review the full milestone structure one
                               more time → confirm (or decline) to start
                               the engagement
15. /contracts/[id]            Once the client funds milestone 1, do the
                               work, then submit it with a note and an
                               optional file attachment
                               … repeat deliver → submit → wait for
                               approval for each remaining milestone,
                               handling any revision requests along the way …
16. /freelancer/earnings        Check running totals as payments release
17. /contracts/[id]            Once the final milestone is approved, the
                               contract auto-completes → leave a review
                               for the client
18. /u/[id]                    (own public profile) See the new review,
                               updated rating, and completed-work count
                               reflected publicly
19. /notifications              Catch up on any alerts missed along the way
```

**Pages visited (freelancer):** `/`, `/login`, `/auth/role-select`,
`/settings/profile`, `/freelancer/dashboard`, `/freelancer/portfolio`,
`/projects`, `/projects/[id]`, `/freelancer/saved`, `/freelancer/bids`,
`/messages`, `/contracts/[id]`, `/freelancer/earnings`, `/u/[id]`,
`/freelancer/contracts`, `/notifications`.

---

### C. Where the Two Journeys Meet

| Moment | Client action | Freelancer action | Shared page |
|---|---|---|---|
| Discovery | Posts the project | Finds and bids on it | `/projects/[id]` |
| Selection | Awards the bid | Gets notified of the win | `/projects/[id]` → `/contracts/[id]` |
| Kickoff | Waits for confirmation | Confirms the milestone plan | `/contracts/[id]` |
| Execution | Funds, then reviews the work | Delivers, then submits the work | `/contracts/[id]` |
| Payment | Approves → releases escrow | Receives the payout | `/contracts/[id]` → ledgers |
| Closure | Leaves a review | Leaves a review | `/contracts/[id]` → `/u/[id]` |
| Throughout | Can message anytime | Can message anytime | `/messages` |

---

### D. Admin Journey (for completeness)

```
1.  /admin                     Overview: total users, projects, contracts,
                               volume released, open disputes
2.  /admin/users               Search/filter accounts; verify or suspend
                               as needed
3.  /admin/disputes            Review an escalated milestone dispute →
                               resolve by releasing escrow or refunding
4.  /admin/reports              Review user-submitted reports → suspend
                               the reported account or close the report
```
