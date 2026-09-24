"use client";

import { cn } from "@/lib/utils";
import { Invoice, InvoiceStatus, RecurrenceStatus } from "@/types/marketplace";

const TONE: Record<InvoiceStatus, string> = {
  sent: "bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
  acknowledged: "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  paid: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  cancelled: "bg-secondary text-foreground/60 border-border",
};

const LABEL: Record<InvoiceStatus, string> = {
  sent: "Awaiting client",
  acknowledged: "Acknowledged",
  paid: "Paid",
  cancelled: "Withdrawn",
};

export function InvoiceStatusPill({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
        TONE[status],
        className
      )}
    >
      {LABEL[status]}
    </span>
  );
}

/**
 * Overdue is derived, not stored: an invoice is overdue when it's unpaid
 * and past its due date. Keeping it out of the status enum means it can
 * never drift out of sync with the calendar.
 */
export function isOverdue(invoice: Pick<Invoice, "status" | "due_date">) {
  if (!invoice.due_date) return false;
  if (invoice.status !== "sent" && invoice.status !== "acknowledged") return false;
  return new Date(invoice.due_date + "T23:59:59") < new Date();
}

export function daysOverdue(invoice: Pick<Invoice, "status" | "due_date">) {
  if (!isOverdue(invoice) || !invoice.due_date) return 0;
  const due = new Date(invoice.due_date + "T00:00:00").getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((today - due) / 86_400_000));
}

export function OverduePill({
  invoice,
  className,
}: {
  invoice: Pick<Invoice, "status" | "due_date">;
  className?: string;
}) {
  const days = daysOverdue(invoice);
  if (days < 1) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-800 dark:text-rose-300",
        className
      )}
    >
      {days === 1 ? "1 day late" : `${days} days late`}
    </span>
  );
}

const RECURRENCE_TONE: Record<RecurrenceStatus, string> = {
  pending_approval: "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  active: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  paused: "bg-secondary text-foreground/70 border-border",
  declined: "bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
  ended: "bg-secondary text-foreground/60 border-border",
};

const RECURRENCE_LABEL: Record<RecurrenceStatus, string> = {
  pending_approval: "Awaiting client",
  active: "Active",
  paused: "Paused",
  declined: "Declined",
  ended: "Ended",
};

export function RecurrenceStatusPill({
  status,
  className,
}: {
  status: RecurrenceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
        RECURRENCE_TONE[status],
        className
      )}
    >
      {RECURRENCE_LABEL[status]}
    </span>
  );
}
