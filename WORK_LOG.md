# jayree.io — work log

What was asked for, what changed, and why. Newest last.

**Scope of this record.** Entries from **8 September 2026** onward are written
from the working conversation, so they carry the reasoning as well as the
result. Everything before that is reconstructed from commit history alone —
the *what*, not the *why*. Commit hashes are given throughout so anything here
can be checked against `git show`.

Requirements are stated as requirements rather than quoted verbatim, so each
entry reads as a specification of what was wanted. Where a requirement was
refined over several rounds, the rounds are listed in order, because the
sequence is often the most useful part of the record.

At the time of writing: 57 commits, 26 migrations, `main` at `96c7f08`.

---

## The project in one paragraph

**jayree.io** is a freelance marketplace for photographers, videographers and
editors. Its organising principle is that work is split into milestones with a
fixed price agreed upfront, each funded into escrow before it starts and
released on approval — so a freelancer is never invoicing into silence and a
client never pays for work they have not seen. Next.js 16 (App Router),
Supabase (Postgres + RLS + SECURITY DEFINER RPCs), deployed on Vercel.

---

# Part 1 — Before 8 September

Reconstructed from commits. No conversational record.

### Foundation

| Commit | What |
|---|---|
| `d8cf02d`, `d9268eb` | Initial Next.js app |
| `0f5f1f3` | Rebuilt as a freelance marketplace with milestone escrow |
| `68223b8` | Removed SECURITY DEFINER views; denormalised aggregates onto `profiles` |

### Discovery and SEO

| Commit | What |
|---|---|
| `efcc38a` | Discover page: live external listings via Remote OK |
| `72e8748` | Dropped Remote OK; filtered to genuine freelance work |
| `d1df2ce` | Added ProductionHUB as a photo/video listing source |
| `33c84ec` | SEO: metadata, sitemap, robots, JSON-LD, category landing pages |

### Money

| Commit | What |
|---|---|
| `8427d0c` | Milestone invoicing with vector PDF download |
| `407897b` | Invoices emailed to clients over Gmail SMTP |
| `97ebacd` | Recurring retainer invoices with a daily overdue chase |
| `dbbe109` | **Security fix** — platform-only functions were callable with the anon key |

### People

| Commit | What |
|---|---|
| `1841031` | Profile onboarding, worldwide cities, freelancer directory |
| `cf6d114` | **Security fix** — billing details were still world-readable |
| `96e5964`, `028b60d` | Directory became "Find people" at `/people`, with permanent redirects |

### Calls, and narrowing the market

| Commit | What |
|---|---|
| `dd3e25c` | 1:1 video calling in messages via 8x8 JaaS |
| `7bde160` | JaaS credential verifier script |
| `85c5c20` | Fixed calls wedging a conversation after one was abandoned |
| `5305eb7` | Made the call-liveness migration re-runnable |
| `c32c42a` | Photo/video focus: category, skills, community directory |
| `3d4f2bf` | Narrowed the marketplace to photo, video and editing |
| `016faed` | Stripped the general-marketplace leftovers from the UI |

### Milestones move

| Commit | What |
|---|---|
| `f42095b` | Milestone planning moved to *after* the award, not before the bid |
| `f85245b` | Fixed: nothing could be published once milestones moved |
| `a59bb0f` | Bid notes published as a public thread on each project |

### The homepage, first pass

| Commit | What |
|---|---|
| `71e3890` | Homepage rebuilt around both audiences and live work |
| `868afa5` | Led with the two audiences, in colour |
| `21881e6` | Fixed long text overflowing the layout |

---

# Part 2 — 8 September onward

## Currency: back to one, and that one is USD

**Requirement.** Return the platform to a single default currency, exactly as
it worked when INR was the default, but with USD in that role.

The platform had been INR-only, then briefly multi-currency (`8f344d0`,
`22b8a8e`, `cdea134`, `3b8e568`), which put a currency decision in front of the
client on every post and turned every total into a breakdown.

**Done** — migration **023**, commit `51c3490`. Single currency again, USD in
the place INR used to hold. Amounts were **re-labelled, not converted**: a
`4000` stays `4000` and now reads `$4,000`. On this database that is test data,
so the digits mattered more than the denomination; the migration carries the
statement for a real conversion if those figures ever meant real money.

`invoices.currency` and `recurring_invoices.currency` survived, because an
invoice is a document that states its own denomination.

---

## Dialogs you could not read

**Requirement.** Dialog boxes are unreadable. Recolour them wherever they
appear so that they match the site's template.

Stock shadcn dialogs were `bg-zinc-950` with white text, while every form
control inside them was light. Dark-on-dark, unreadable.

**Done** — commit `ec6af95`. Fixed the dialog primitive itself, so all twelve
dialogs inherited it.

> **A trap found here:** this template redefines `--color-input` as a white
> *fill*, not shadcn's border colour. `border-input` was therefore invisible.
> Anything that wants a visible edge uses `border-border`.

---

## Two people with the same name

**Requirement.** Establish what happens when two users share a name, then fix
the resulting defect — including the duplicate conversation threads it was
producing for a single person.

**Done** — commit `a595c1e`. Nameless accounts were all collapsing to one
display name, which made distinct people look like the same person and split
their conversations. Added `displayName` / `partyName` helpers and a single
`UNNAMED` fallback in `lib/utils.ts`.

---

## Projects and Contracts become one list

**Requirement.** Projects and Contracts are two separate pages, each with its
own subsections, and the split is confusing. Merge them into a single Projects
section with two subsections — Ongoing and Completed — and surface everything
else as tags on the project, with no loss of functionality. Apply the same
treatment to the freelancer side.

**Done** — commits `7894010` (client) and `011c4b2` (freelancer). One list, two
subsections, everything else as tags.

> **A real bug found while doing it:** `CONTRACT_SELECT` never selected
> milestones, so every contract showed `0/0` milestones complete regardless of
> its actual state.

---

## The deadlock that was not a deadlock

**Requirement.** Clarify whether a freelancer must re-confirm a project after it
is awarded, given that bidding is already a voluntary act. Then resolve the
state the two sides were left in: the client was told it was awaiting freelancer
confirmation while the freelancer was told the client would send milestones, so
each appeared to be waiting on the other.

**Done** — commit `a6228c9`. Both parties were being told to wait for the other.
The state was readable from `plan_sent_at`; the UI just was not reading it. Both
sides now name whose move it is, and they agree.

---

## Cutting the homepage down

**Requirement**, refined over six rounds:

1. The homepage carries far more copy than anyone will read. Cut it to simple,
   minimal, readable text, and remove the hyphens.
2. Remove the explanatory sub-line beneath each headline claim.
3. The rows now run together — add something to separate them.
4. The separators are not visible.
5. They are visible on the client panel but not the freelancer one.
6. The freelancer panel is still undifferentiated. Identify what actually
   differs between the two panels and fix it.

**Done** — `32ce591` (copy halved, hyphens and em-dashes out), `b45aa25`
(sub-lines dropped), `d9b98dc` → `3c81dd0` → `5e69217` → `a3e5125` (the rules).

> **Where this went wrong.** Rounds 3–5 were opacity adjustments made without
> investigating anything. Only at round 6 was the compiled CSS, the live HTML
> and a line-by-line diff of both panels actually checked — which showed the two
> panels were *identical*. Hairlines were simply the wrong instrument on that
> ground, and filled row blocks fixed it. Round 4 should have triggered the
> investigation, not round 6: once a fix has failed twice, measure before
> changing anything again.

---

## Posting a project, shortened

**Requirement.** Posting a project asks for too much and is tiring to complete.
Remove the experience-level field and the overall deadline. Merge the Basics
step into the Skills and Scope step. Cut the skills list — which reads as
arbitrary — to three suggestions each for photography, editing and videography,
and let users type their own. Remove the minimum-length restriction on the
project description and every other field that carries one.

**Done** — migration **024**, commit `ea092ba`. Experience level and overall
deadline gone, Basics merged with Skills, curated skills to three per craft with
free typing for the rest, and every minimum-length check removed (the DB title
check went 5 → 1).

---

## Invoices: two tabs, not five

**Requirement.** The invoice section has too many subsections. Reduce it to
two: recurring retainers, and everything else. Apply the same change to the
freelancer side, which was left on the old layout.

**Done** — commit `ee7c3a0`.

---

## $981 instead of $1,000

**Requirement.** Project creation displays $981 in words when $1,000 was
entered. Find the cause and fix it.

**Done** — the amount-in-words helper was mis-grouping. Rewritten on the short
scale with a `threeDigits` helper.

---

## Bidding, in one box

**Requirement.** Bid submission asks for too many separate fields. Combine the
public note and the proposal into one, remove the proposal's minimum-length
restriction, and move the bid form from the right-hand rail to the centre of the
page, where it reads more naturally.

**Done** — commit `97e2339`. Also `ac68a81`: the scroll wheel was silently
editing number inputs when you scrolled past them, and `101313e`: rejection
notifications pointed at a dead path (migration **025**).

---

## Photographs on the homepage

**Requirement.** The homepage is visually flat. Fill it with photography
relevant to the product, in the manner of pixieset.com, and supply a separate
generation prompt for each image. Repeated for each new set of images
thereafter.

**Done** — `12aae76`. Prompts live in
[jayree-image-prompts.md](jayree-image-prompts.md), Sets A–G. Every generated
PNG is converted to WebP before use; `public/marketing/*.png` is gitignored so
only the WebPs are committed. The six service images alone went **12 MB → 528 KB**.

---

## The hero, rebuilt around a portrait

**Requirement.** Reproduce the layout of ballance.framer.website, keeping this
project's existing colours — clarified explicitly after the first attempt
adopted Ballance's palette as well as its structure.

**Done** — `c82ff8a`, `a7b2b6a`, `a09e3a8`. The structure is Ballance's: a
centred stack on a gradient, a mono pill above the headline, two buttons, the
subject bleeding up out of the gradient. The palette is this project's own — deep
ink resolving to paper, not navy resolving to white — because the photographs
are graded to a warm ground and a blue one would orphan every one of them.

Three follow-ups, each a real geometry problem:

- **The sign-in bar intruded on scroll**, which the reference does not do. The
  navbar now slides out over the hero and returns once it has passed.
- **The subject's head was overlapped by the copy.** The figure had been
  absolutely positioned inside a `124vh` section, so the gap between the buttons
  and his hair was a function of window height. Moved into normal flow, where it
  cannot collide at any size.
- **The correction overshot and dropped him too far.** The measurement had been
  taken to the image *element*, but its upper sixth is empty dark ground before
  the hair starts, so a 64px gap to the element read as nearly 180px of nothing
  on screen. Fixed with a negative margin.

---

## The craft deck and the pinned process board

**Requirement.** Two supplied specifications — a circular rotating card deck and
a pinned-note process timeline — built from the six craft photographs, and then
placed side by side.

**Done** — `5a4575d`.

---

## The spotlight navbar and the service slider

**Requirement.** Build the supplied spotlight-navbar specification, using text
labels in place of its icons. Separately, replace the two benefit panels with an
image slider carrying three points per side, and supply generation prompts for
the six images that needs.

**Done** — `be43411`.

- **`nav-spotlight.tsx`** — one overhead cone marking wherever you are. The brief
  drove it from clicks; this is a real navbar, so it is driven from the **route**
  instead — back, forward and a pasted URL would all leave a click-driven light
  pointing at the wrong thing. A click still moves it immediately and the route
  corrects it when navigation lands.
- **`service-slider.tsx`** — one tall image strip that moves, not three pictures
  that swap. Stepping from the first claim to the third carries the second image
  through the frame on the way, because it is physically between them.

---

## Rename: Roster → jayree.io

**Requirement.** Rename the product from Roster to jayree.io everywhere it
appears, and replace the homepage hero copy with the supplied wording.

**Done** — migration **026**, part of commit `96c7f08`.

The site names itself in **two registers**, so the constant split in two:

| Constant | Value | Used for |
|---|---|---|
| `APP_NAME` | `jayree.io` | Wordmark, page titles, metadata, legal footer |
| `BRAND_NAME` | `Jayree` | Running prose — a lowercase domain cannot open a sentence |

Thirty files: every page description, both email templates, the invoice PDF, the
mailer's From name, the docs. `roster-image-prompts.md` →
`jayree-image-prompts.md`.

**Migration 026** was needed because two functions wrote the old name into
`invoices.payment_terms` — a stored field baked into every downloaded PDF.
`create_invoice` wrote `'Paid via Roster escrow'` and `issue_recurring_invoice`
wrote `'Net N — payable via Roster'`. Both bodies were reproduced verbatim with
only that string changed, and rows already issued were rewritten.

> **`CREATE OR REPLACE`, never `DROP` + `CREATE`.** Replace preserves a
> function's privileges; drop-and-recreate silently discards them.
> `issue_recurring_invoice` is service-role-only by grant, so dropping it would
> have quietly opened it to `anon` and `authenticated`. This was learned the
> hard way in migration 015.

Deliberately left alone: video call rooms are still named `roster-<id>`. That is
an opaque JaaS identifier, never displayed, stored on `calls.room_name` —
changing the prefix would split old and new rooms for no visible gain.

---

## Dark by default, with a light toggle

**Requirement.** Make dark the site's default theme, and keep both light and
dark available to the user.

**Done** — part of commit `96c7f08`.

> **The blocker.** `@theme inline` bakes a *literal* value into the utility, so
> `--color-card: #ffffff` compiled to `.bg-card{background-color:#fff}` and no
> amount of redefining `--color-card` at runtime could move it. The Tailwind
> theme now points at plain CSS variables instead, which makes every colour
> late-bound: `.bg-card{background-color:var(--card)}`.

**Dark lives on `:root`, not behind a class.** A browser with JavaScript
disabled never runs the pre-paint script, so whichever theme sits there is what
those visitors get — and the default should not depend on JS. Light is the
opt-in, added as a class by a blocking inline script in `<head>`. Verified in
the served HTML: the script is at byte 6471 with `<body>` at 7390, so it runs
before first paint and a visitor who chose light never sees a dark frame.

Tailwind's stock `dark:` keys off `prefers-color-scheme`, which this site does
not use, so it is redefined as *"no `.light` on `<html>`"* — a negation, because
the default state carries no class at all — and `light:` is added as its
opposite.

A lot of the site had to stop assuming a light page:

| Change | Count | Why |
|---|---|---|
| `bg-white` → `bg-card` | 104 | These meant "the card colour", not "white" |
| ink buttons/chips → `primary` | 70 | A dark pill on a dark page is invisible |
| `border-ink/*` → `border-foreground/*` | 25 | Same colour in light, flips in dark |
| status tints given `dark:` variants | 115 | `bg-amber-50 text-amber-800` and friends |

Three `bg-white` uses stayed white on purpose: the nav spotlight's source bar
(it is a light) and the paper pill's hover.

Printing forces the light palette, so an invoice saved from the dark theme is
not light text on white paper.

Two bugs only visible once the page went dark: the hero gradient ended on paper,
putting a white band across a dark page (it is `var(--hero-gradient)` now); and
the process timeline's note titles used `text-foreground`, which turned light
and vanished into the pink note.

---

## Both sides, four points each

**Requirement.** Keep the section's existing design, take its wording from the
supplied reference, and extend it to four points per side. Reassign the panel
colours: orange for freelancers, blue for clients. Later refined — the panels
were filled with solid colour, where the reference uses a dark card with a
coloured wash.

**Done** — part of `96c7f08`.

Four points a side, the reference's copy, and a section header above them.
**Six of the eight images already existed** and were remapped rather than
regenerated; two are stand-ins awaiting Set G in
[jayree-image-prompts.md](jayree-image-prompts.md).

The panels started as solid persimmon and solid blue, which put two of the
loudest surfaces on the site side by side and left the photographs inside
fighting the panel. They are now dark cards each lit from its top corner by its
own colour. The accent stays at full strength on exactly two marks — the eyebrow
and the active row's rule — both lifted for the dark ground (`#f2703c`,
`#54a2ea`), since the panel's own colours are too dim as small text on it.

Blue is the first cool colour on a deliberately warm site, so it is kept deep:
it has to read as the other half of a pair with the persimmon, not as a
different website.

---

## The 3D carousel

**Requirement.** Build the supplied specification for a fullscreen draggable 3D
image carousel, using the existing craft photographs. Separate the two
side-by-side sections into stacked ones.

**Done** — `components/shared/craft-carousel.tsx`, part of `96c7f08`.

Where it departs from the brief, and why:

| Brief | Here | Why |
|---|---|---|
| `html, body { background: #09090b }` | Not done | Repaints the whole site from one section and breaks the light theme outright. The band paints its own ground. |
| Indigo and blue ground | Persimmon and amber | The brief names indigo as its own fallback *"when no design system exists"*. This one has one. |
| `width: 100vw` | `w-full` | On a page with a scrollbar, `100vw` is wider than the content box — exactly the horizontal overflow the brief asks to avoid. |
| 8–10 cards | 12 slots, 6 images | Six photographs would sit 60° apart, leaving you looking into the gap as often as at a card. Each appears twice, 180° apart — never both in view. |
| — | Group pushed back one radius | Without it, a card at +460px under a 760px perspective is magnified 2.5× and fills the screen. |
| Shared-element expansion via layout animation | Measured rects | Framer's layout animation mis-measures through a `preserve-3d` ancestor. |

> **The bug worth remembering.** The brief says to capture the pointer on
> pointerdown. Doing so **silently broke every click**: a captured pointer
> retargets the following `click` to the capturing element, so the card's own
> handler never ran and nothing could open. The drag runs on window listeners
> instead.

A second one: the overlay rendered *under* the navbar, because the band sets
`isolate` and no `z-index` inside it can beat a fixed sibling. It portals to
`document.body` now.

---

## The process timeline goes horizontal

**Requirement**, refined over three rounds:

1. Keep the timeline's existing design, take its wording from the supplied
   reference, and lay the points out horizontally.
2. The section does not work in the dark theme.
3. The cards are still wrong — they remain light-coloured on a dark site.

**Done** — part of `96c7f08`. Five steps, the reference's copy, laid out in a row.

Three things had to give:

1. **The fixed 1000×1130 coordinate space is gone.** It existed so a hand-drawn
   curve could meet each zigzagging card exactly, and it scaled as a whole to fit
   its column. In a row that space needs to be ~1400 wide and scales to about
   0.75 in a real container — which drags the 14px note text down to 10px,
   because scaling a stage scales its type. It is an ordinary flex row now.
2. **The curved route became one straight dashed line at pin height.** With five
   notes across, the gaps are ~24px; a curve drawn through one of those is not a
   curve anybody can see. The notes hang off a single line instead.
3. **The card mount went, then the notes started following the theme.** The
   mount was `bg-card` sitting on a `bg-card` section, so five of them merged
   into one black bar with the notes glued on. And the notes themselves had been
   kept as pale paper in both themes on the argument that *a pinned note is
   paper* — but five cream rectangles are the brightest thing on a near-black
   page by a wide margin, and they read as cut-outs pasted over the site. Dark
   tints of the same three accents now, with contrast of 14:1 on titles and
   5.9–7.1:1 on the numbers.

> **A correction worth recording.** The instruction to remove the deck was read
> as covering the carousel as well as the old `CraftDeck`. It meant only the
> deck. The carousel was restored; `craft-deck.tsx` and the `/crafts` preview
> route stayed deleted.

---

# Decisions worth not relearning

- **`CREATE OR REPLACE FUNCTION` preserves privileges. `DROP` + `CREATE`
  silently discards them.** Migration 015 learned this the expensive way.
- **`@theme inline` bakes literal values into utilities.** For anything that has
  to change at runtime, point the theme at a plain CSS variable.
- **`setPointerCapture` retargets the following `click`** to the capturing
  element. Anything clickable underneath stops working.
- **`100vw` is wider than the content box** whenever there is a scrollbar.
- **`element.getBoundingClientRect()` is not what the eye measures.** A
  photograph with empty ground at the top reads as a much larger gap than its
  box says.
- **`Page.captureScreenshot`'s `clip` is in page coordinates, not viewport
  coordinates.** Two black screenshots were spent finding that out.
- **A semantic token survives a theme change; a literal one does not.** `ink` is
  a surface colour that happens to be dark — using it for an emphasis border
  silently assumed a light page.
- **`next/image` optimisation is keyed on the URL.** Replacing a file in place
  needs a hard refresh.

---

# Still outstanding

**Blocking a real launch**

- No payment processor. Escrow is modelled in the database but no money moves.
- No admin account exists.
- `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are not set on Vercel, so the
  recurring-invoice and overdue-chase jobs will not run in production.

**Known bugs**

- **Notification text still hard-codes `₹`** in six database functions
  (migrations 001, 002, 006, 009, 010, 018). A client on a $1,000 milestone is
  told *"₹1000 is held in escrow"*, even though the platform has been USD-only
  since migration 023. Needs its own migration.
- On mobile, the stacked benefit panel has a lot of empty space below its list.

**Loose ends**

- Two service-slider images are stand-ins. Set G in
  [jayree-image-prompts.md](jayree-image-prompts.md) has the prompts; until they
  exist, two pictures appear twice in that section.
- Image prompt Sets C, D and E were written but never generated.
- `sitemap-live.xml` is untracked and stale from an old crawl.
- `package.json` still reads `"name": "stagelink"`, and the git remote is
  `stagelink.git` — a legacy name from before Roster, never mentioned in any
  request.
- `components/shared/craft-grid.tsx` is parked and renders nowhere.

---

# Standing constraints

- **Never** put the Supabase service-role key in the frontend, and never prefix
  a secret with `NEXT_PUBLIC_` — that includes the Gmail app password, the JaaS
  private key, `CRON_SECRET` and the service-role key.
- The JaaS private key is not to be shared into a conversation.
- Migrations are written here and run by hand; nothing applies them
  automatically.
- Applied migrations are not edited. A change to a shipped function goes in a
  new migration.
