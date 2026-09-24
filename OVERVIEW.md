# jayree.io — Freelance Marketplace Architecture

## What It Is

A freelance marketplace built around one differentiating mechanic:

> **Clients structure projects into milestones → freelancers inspect the full
> structure and bid competitively → the client picks the best fit → the
> freelancer confirms the milestone plan → payment is escrowed and released
> per approved milestone.**

Two user roles: **client** (hires) and **freelancer** (delivers), plus **admin**
for moderation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | React 19, Tailwind CSS v4, Radix primitives |
| Backend | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| Auth | Supabase Auth (Google OAuth + magic link) — **unchanged from before** |
| Animation | Framer Motion (used sparingly) |
| Forms | Controlled React state |
| Notifications | Sonner (toasts) + DB-backed notification system |

---

## Design System

Editorial, print-inspired — deliberately not a generic SaaS dashboard.

- **Type**: Fraunces (display serif) for headings and numbers, Instrument Sans for UI
- **Palette**: warm paper `#f7f4ee`, ink `#171410`, single persimmon accent `#d6440f`
- **Surfaces**: white cards, hairline `rgba(26,23,19,0.12)` borders, no gradients or glassmorphism
- **Motion**: fade-up on scroll, one marquee. No floating blobs.
- Tokens live in [app/globals.css](app/globals.css) under `@theme inline`.

---

## Database

Full schema in [supabase/migrations/001_marketplace.sql](supabase/migrations/001_marketplace.sql).

### Core tables

`profiles` · `categories` · `skills` · `projects` · `project_attachments` ·
`milestones` · `bids` · `contracts` · `milestone_submissions` · `transactions` ·
`reviews` · `conversations` · `messages` · `notifications` · `saved_projects` ·
`portfolio_items` · `disputes` · `reports`

Reputation and financial aggregates (`avg_rating`, `total_reviews`,
`total_earned`, `total_spent`) are denormalised columns on `profiles`,
maintained by triggers on `reviews` and `transactions`. They were originally
Postgres views, but views run with their creator's permissions and so bypassed
RLS on `transactions` — migration 003 removed them.

### State machines (enforced by triggers, not app code)

- **Project**: `draft → open → awarded → in_progress → completed | cancelled`
- **Bid**: `submitted → shortlisted → accepted | rejected | withdrawn`
- **Contract**: `pending_acceptance → active → completed | cancelled | declined`
- **Milestone**: `pending → in_progress → submitted → revision_requested ⇄ submitted → paid`, plus `disputed` / `cancelled`

### Security model

Every sensitive transition runs through a `SECURITY DEFINER` RPC that checks
`auth.uid()` itself:

| RPC | Enforces |
|---|---|
| `accept_bid` | only the project owner; auto-rejects other bids; creates the contract |
| `respond_contract` | only the awarded freelancer; accept or decline the milestone plan |
| `fund_milestone` | only the client; milestones must be funded in sequence |
| `submit_milestone` | only the assigned freelancer, only in a submittable state |
| `approve_milestone` | only the client; writes the ledger row; auto-completes the contract |
| `request_revision` | only the client, only on a submitted milestone |
| `open_dispute` | either party; freezes the milestone; alerts admins |
| `resolve_dispute` | admins only; releases or refunds escrow |
| `cancel_contract` | either party; refunds unfinished funded milestones |
| `create_review` | only contract participants, only after the contract ends |

Direct table writes are blocked where it matters:

- `transactions` has **no** insert/update/delete policy — the ledger is only
  written inside definer RPCs.
- `reviews` is read-only to clients; inserts go through `create_review`.
- Guard triggers (`in_rpc()` flag) reject raw status updates on projects, bids,
  and milestones that bypass the RPCs.
- `guard_profile_update` prevents self-verification, self-unsuspension, and
  role escalation to `admin`.
- Every RPC calls `require_auth()` first. Without it, `auth.uid()` being NULL
  made ownership checks like `client_id <> auth.uid()` evaluate to NULL rather
  than TRUE, so the guard silently passed (fixed in migration 002).
- No SECURITY DEFINER views. Aggregates that need to be public live as columns
  on `profiles` under its ordinary RLS policy (migration 003).

---

## Payment Architecture

Milestone-based escrow, modelled as an append-only ledger:

```
User → Project → Milestone → Transaction
```

`transactions.type` is one of `escrow_fund` (client → platform),
`release` (platform → freelancer), `refund` (platform → client).

The current build **simulates** the payment processor: RPCs write ledger rows
with `reference = 'SIMULATED'`. Wiring a real PSP (Razorpay/Stripe) means
calling it before `fund_milestone` / inside `approve_milestone` and storing the
provider reference — the schema, state machine, and authorization do not change.
Payment state is never trusted from the client.

---

## Route Map

**Public**: `/` · `/projects` · `/projects/[id]` · `/u/[id]` · `/login`

**Client**: `/client/dashboard` · `/client/projects` · `/client/contracts` ·
`/client/payments` · `/projects/new`

**Freelancer**: `/freelancer/dashboard` · `/freelancer/bids` ·
`/freelancer/contracts` · `/freelancer/saved` · `/freelancer/earnings` ·
`/freelancer/portfolio`

**Shared (any role)**: `/contracts/[id]` · `/messages` · `/notifications` ·
`/settings/profile`

**Admin**: `/admin` · `/admin/users` · `/admin/disputes` · `/admin/reports`

Route protection is layered: [proxy.ts](proxy.ts) blocks anonymous access to
workspace routes, `WorkspaceShell` enforces the correct role client-side, and
RLS enforces data access regardless of either.

---

## Key Files

| Concern | File |
|---|---|
| Database migration | [supabase/migrations/001_marketplace.sql](supabase/migrations/001_marketplace.sql) |
| Types | [types/marketplace.ts](types/marketplace.ts) |
| Services | [lib/services/](lib/services/) — `projects`, `bids`, `contracts`, `profiles`, `messaging`, `notifications`, `admin`, `storage`, `auth` |
| Design tokens | [app/globals.css](app/globals.css) |
| Milestone rail | [components/shared/milestone-list.tsx](components/shared/milestone-list.tsx) |
| Bid comparison | [components/shared/bid-comparison.tsx](components/shared/bid-comparison.tsx) |
| Workspace chrome | [components/layout/workspace-shell.tsx](components/layout/workspace-shell.tsx) |

---

## Setup

1. Run [supabase/migrations/001_marketplace.sql](supabase/migrations/001_marketplace.sql)
   once in the Supabase SQL editor (see README for detail).
2. `npm install && npm run dev`.
3. Sign in, pick an account type, complete your profile.
4. To access `/admin`, promote yourself with the SQL snippet at the bottom of
   the migration file.
