# Roster

A freelance marketplace built on **structured milestones, competitive bidding,
and escrow-protected payments**.

Clients break a project into milestones — each with its own deliverables,
deadline, and price. Freelancers see that entire structure *before* they bid,
compete on merit rather than price alone, and explicitly confirm the plan before
work starts. Each milestone is funded into escrow up front and released only
when the client approves the deliverable.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 (editorial design system), Framer Motion
- **UI:** Radix primitives, Lucide icons
- **Backend:** Supabase — PostgreSQL, Row Level Security, Realtime, Storage
- **Auth:** Supabase Auth (Google OAuth + magic link)

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.

```bash
cp .env.example .env.local
```

### 3. Database — run the migration ONCE

Open your Supabase project → **SQL Editor** → paste the entire contents of
`supabase/migrations/001_marketplace.sql` → **Run**.

This single transaction:

- Creates the full marketplace schema (18 tables, 2 views, enums, indexes)
- Adds state-machine triggers and `SECURITY DEFINER` RPCs for every sensitive
  operation (awarding, funding, approving, disputing, reviewing)
- Enables Row Level Security on every table
- Seeds 12 categories and 48 skills
- **Migrates existing accounts** — every `auth.users` row gets a `profiles` row,
  with old musicians mapped to freelancers and organizers to clients
- Drops the obsolete tables from the previous product

Auth users, sessions, and the `media` storage bucket are **preserved**. It runs
in a transaction, so a failure rolls back cleanly.

### 4. Grant yourself admin (optional)

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

### 5. Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Project structure

```
app/
  page.tsx              landing
  projects/             browse · [id] detail+bidding · new (creation wizard)
  contracts/[id]/       milestone workspace (both roles)
  client/               dashboard · projects · contracts · payments
  freelancer/           dashboard · bids · contracts · saved · earnings · portfolio
  admin/                overview · users · disputes · reports
  messages/ notifications/ settings/profile/ u/[id] (public profile)
components/
  layout/               navbar · footer · sidebar · workspace shells
  shared/               project card · milestone list · bid panel · bid comparison · …
  ui/                   Radix-based primitives
lib/services/           Supabase data access, one module per domain
supabase/migrations/    the schema
types/marketplace.ts    shared types
proxy.ts                route protection (Next.js 16 renamed middleware → proxy)
```

## Core workflows

**Client:** sign up → pick "I'm hiring" → complete profile → post a project
(basics → skills → milestones → review) → receive bids → compare on price,
rating, and proposal → award → fund milestone → review submission → approve
(payment releases) → repeat → review the freelancer.

**Freelancer:** sign up → pick "I'm freelancing" → complete profile and skills →
add portfolio → browse/filter projects → inspect milestones → bid → get awarded
→ **confirm the milestone structure** → deliver → submit → get paid per
milestone → review the client.

## Security notes

- Payment state can never be set from the client — `transactions` has no write
  policy and is only touched inside definer RPCs.
- Status transitions are validated by database triggers, so a crafted request
  can't skip a step (e.g. approve an unfunded milestone).
- Users cannot self-verify, self-unsuspend, or promote themselves to admin.
- Route guards exist in three layers: `proxy.ts`, the workspace shell, and RLS.
- Only the anon key is used client-side; no service-role key is in the frontend.

See [OVERVIEW.md](OVERVIEW.md) for the full architecture, state machines, and
RPC reference.
