"use client";

import { cn } from "@/lib/utils";
import { InvoiceStatus } from "@/types/marketplace";

const TONE: Record<InvoiceStatus, string> = {
  sent: "bg-sky-50 text-sky-800 border-sky-200",
  acknowledged: "bg-amber-50 text-amber-800 border-amber-200",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-200",
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
