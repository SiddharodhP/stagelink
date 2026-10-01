import type {
  Contract,
  Milestone,
  MilestoneSubmission,
  Transaction,
} from "@/types/marketplace";
import { formatPrice } from "@/lib/utils";

/**
 * The project's history, as lines that sit in the chat alongside what people
 * actually typed.
 *
 * DERIVED, NOT STORED
 *
 * Every step already leaves a timestamp -- the contract's own columns, a row
 * in transactions, a row in milestone_submissions -- so the timeline is read
 * out of contract state rather than written into the messages table.
 *
 * That was the choice worth making carefully. Storing system messages would
 * mean a migration plus an insert in each of the eight RPCs that move a
 * project along, and every project that already exists would start with an
 * empty history. Deriving means the timeline cannot disagree with the
 * contract, because it IS the contract, and it works on data already there.
 * The cost is that an event cannot be edited or dismissed, which nothing
 * here needs.
 *
 * ONE EVENT THAT HAS NO CLOCK
 *
 * request_revision sets a status and a note but records no time. A revision
 * is therefore placed immediately after the delivery it rejected, which is
 * the right order even though it is not the right minute.
 */

export type TimelineEvent = {
  id: string;
  at: string;
  /** Written from the reader's side: "You funded…" vs "Tony funded…". */
  text: string;
  /** Drives the icon. */
  kind:
    | "awarded"
    | "plan"
    | "started"
    | "funded"
    | "delivered"
    | "revision"
    | "released"
    | "completed";
};

function quote(s: string) {
  return `“${s}”`;
}

export function buildTimeline({
  contract,
  milestones,
  transactions,
  submissions,
  viewerIsClient,
  otherName,
}: {
  contract: Contract | null | undefined;
  milestones: Milestone[];
  transactions: Transaction[];
  submissions: MilestoneSubmission[];
  viewerIsClient: boolean;
  /** What to call the other party in the third person. */
  otherName: string;
}): TimelineEvent[] {
  if (!contract) return [];

  const events: TimelineEvent[] = [];
  const titleOf = (id: string | null) =>
    milestones.find((m) => m.id === id)?.title ?? "a milestone";

  // ---- Awarded ----
  events.push({
    id: `awarded-${contract.id}`,
    at: contract.created_at,
    kind: "awarded",
    text: viewerIsClient
      ? `You awarded this project to ${otherName}.`
      : `${otherName} awarded you this project.`,
  });

  // ---- Milestone plan sent ----
  if (contract.plan_sent_at) {
    const live = milestones.filter((m) => m.status !== "cancelled");
    const total = live.reduce((s, m) => s + m.amount, 0);
    const detail =
      live.length > 0
        ? ` — ${live.length} stage${live.length === 1 ? "" : "s"}, ${formatPrice(total)} in total`
        : "";
    events.push({
      id: `plan-${contract.id}`,
      at: contract.plan_sent_at,
      kind: "plan",
      text: viewerIsClient
        ? `You sent the milestone plan${detail}.`
        : `${otherName} sent a milestone plan${detail}. Confirm it to start work.`,
    });
  }

  // ---- Freelancer confirmed, work began ----
  if (contract.started_at) {
    events.push({
      id: `started-${contract.id}`,
      at: contract.started_at,
      kind: "started",
      text: viewerIsClient
        ? `${otherName} confirmed the plan. Work has started.`
        : "You confirmed the plan. Work has started.",
    });
  }

  // ---- Money moving, from the ledger rather than the milestone flags ----
  for (const t of transactions) {
    const name = quote(titleOf(t.milestone_id));
    const amount = formatPrice(t.amount);

    if (t.type === "escrow_fund") {
      events.push({
        id: `tx-${t.id}`,
        at: t.created_at,
        kind: "funded",
        text: viewerIsClient
          ? `You funded ${name}. ${amount} is held in escrow until you approve the work.`
          : `${otherName} funded ${name}. ${amount} is in escrow — you can start.`,
      });
    } else if (t.type === "release") {
      events.push({
        id: `tx-${t.id}`,
        at: t.created_at,
        kind: "released",
        text: viewerIsClient
          ? `You approved ${name}. ${amount} was released to ${otherName}.`
          : `${otherName} approved ${name}. ${amount} was released to you.`,
      });
    }
  }

  // ---- Deliveries ----
  for (const sub of submissions) {
    const name = quote(titleOf(sub.milestone_id));
    events.push({
      id: `sub-${sub.id}`,
      at: sub.created_at,
      kind: "delivered",
      text: viewerIsClient
        ? `${otherName} delivered ${name} for your review.`
        : `You delivered ${name} for review.`,
    });
  }

  // ---- Revisions, placed just after the delivery they rejected ----
  for (const m of milestones) {
    if (m.status !== "revision_requested") continue;
    const last = submissions
      .filter((s) => s.milestone_id === m.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .at(-1);
    // Without a submission there is nothing to anchor to, and inventing a
    // time would put the event in the wrong place in the thread.
    if (!last) continue;
    events.push({
      id: `rev-${m.id}`,
      at: new Date(new Date(last.created_at).getTime() + 1000).toISOString(),
      kind: "revision",
      text: viewerIsClient
        ? `You asked for a revision on ${quote(m.title)}.`
        : `${otherName} asked for a revision on ${quote(m.title)}.`,
    });
  }

  // ---- Done ----
  if (contract.completed_at) {
    events.push({
      id: `done-${contract.id}`,
      at: contract.completed_at,
      kind: "completed",
      text: "Every milestone has been delivered, approved and paid. This project is complete.",
    });
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}
