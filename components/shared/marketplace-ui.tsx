"use client";

import { Star, BadgeCheck } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import {
  MILESTONE_STATUS_LABELS,
  BID_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/constants";

/* ---------- Status pills, tuned per domain ---------- */

const TONE: Record<string, string> = {
  neutral: "bg-secondary text-foreground/70 border-border",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  wait: "bg-amber-50 text-amber-800 border-amber-200",
  good: "bg-emerald-50 text-emerald-800 border-emerald-200",
  bad: "bg-red-50 text-red-700 border-red-200",
  ink: "bg-ink text-paper border-ink",
};

const PROJECT_TONES: Record<string, string> = {
  draft: "neutral", open: "good", awarded: "info",
  in_progress: "info", completed: "ink", cancelled: "bad",
};
const BID_TONES: Record<string, string> = {
  submitted: "info", shortlisted: "wait", accepted: "good",
  rejected: "neutral", withdrawn: "neutral",
};
const MILESTONE_TONES: Record<string, string> = {
  pending: "neutral", in_progress: "info", submitted: "wait",
  revision_requested: "wait", approved: "good", paid: "good",
  disputed: "bad", cancelled: "neutral",
};
const CONTRACT_TONES: Record<string, string> = {
  pending_acceptance: "wait", active: "info", completed: "ink",
  cancelled: "bad", declined: "neutral",
};

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
        TONE[tone] || TONE.neutral
      )}
    >
      {label}
    </span>
  );
}

export function ProjectStatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: "Draft", open: "Open for bids", awarded: "Awarded",
    in_progress: "In progress", completed: "Completed", cancelled: "Cancelled",
  };
  return <Pill label={labels[status] || status} tone={PROJECT_TONES[status] || "neutral"} />;
}

export function BidStatusPill({ status }: { status: string }) {
  return <Pill label={BID_STATUS_LABELS[status] || status} tone={BID_TONES[status] || "neutral"} />;
}

export function MilestoneStatusPill({ status }: { status: string }) {
  return <Pill label={MILESTONE_STATUS_LABELS[status] || status} tone={MILESTONE_TONES[status] || "neutral"} />;
}

/**
 * pending_acceptance covers two opposite situations, and calling both of
 * them "Awaiting freelancer confirmation" told the client the freelancer
 * was holding things up when the milestone plan had not been written yet.
 * Both sides then sat waiting for the other.
 *
 * Migration 018 stored the difference in plan_sent_at rather than adding an
 * enum value, so pass it in and the pill can say which half it is. Callers
 * that omit it keep the old label.
 */
export function ContractStatusPill({
  status,
  planSent,
}: {
  status: string;
  planSent?: boolean;
}) {
  if (status === "pending_acceptance" && planSent === false) {
    return <Pill label="Planning milestones" tone="wait" />;
  }
  return <Pill label={CONTRACT_STATUS_LABELS[status] || status} tone={CONTRACT_TONES[status] || "neutral"} />;
}

/* ---------- Identity ---------- */

export function UserAvatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-full border border-border object-cover", className)}
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-display font-semibold text-brand-deep",
        className
      )}
    >
      {getInitials(name || "?")}
    </span>
  );
}

export function NameWithBadge({
  name,
  verified,
  className,
}: {
  name: string;
  verified?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {name}
      {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified" />}
    </span>
  );
}

/* ---------- Reputation ---------- */

export function RatingStars({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  if (!count) {
    return (
      <span className={cn("rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-deep", className)}>
        New
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium", className)}>
      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
      {rating.toFixed(1)}
      <span className="font-normal text-muted-foreground">({count})</span>
    </span>
  );
}

/* ---------- Skills ---------- */

export function SkillTags({
  skills,
  max = 4,
  className,
}: {
  skills: string[];
  max?: number;
  className?: string;
}) {
  const shown = skills.slice(0, max);
  const extra = skills.length - shown.length;
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((s) => (
        <span
          key={s}
          className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
        >
          {s}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[11px] font-medium text-muted-foreground">+{extra}</span>
      )}
    </span>
  );
}
