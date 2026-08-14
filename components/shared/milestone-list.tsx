"use client";

import { Milestone } from "@/types/marketplace";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { MilestoneStatusPill } from "@/components/shared/marketplace-ui";
import { Check, Lock } from "lucide-react";

/**
 * Numbered milestone rail. Used read-only on project pages and as the
 * backbone of the contract workspace (pass renderActions for controls).
 */
export function MilestoneList({
  milestones,
  showStatus = false,
  activeId,
  renderActions,
}: {
  milestones: Milestone[];
  showStatus?: boolean;
  activeId?: string | null;
  renderActions?: (m: Milestone) => React.ReactNode;
}) {
  const total = milestones.reduce((s, m) => s + (m.status !== "cancelled" ? m.amount : 0), 0);

  return (
    <div>
      <ol className="relative space-y-0">
        {milestones.map((m, i) => {
          const done = m.status === "paid";
          const isActive = activeId === m.id;
          const isLast = i === milestones.length - 1;
          return (
            <li key={m.id} className="relative flex gap-4 pb-0">
              {/* rail */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    done
                      ? "border-ink bg-ink text-paper"
                      : isActive
                        ? "border-brand bg-brand-soft text-brand-deep"
                        : "border-border bg-white text-foreground/60"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : m.seq}
                </span>
                {!isLast && <span className="w-px flex-1 bg-border" />}
              </div>

              {/* content */}
              <div className={cn("min-w-0 flex-1 pb-8", isLast && "pb-2")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold leading-snug">{m.title}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.due_date ? `Due ${formatDate(m.due_date)}` : "No deadline"}
                      {m.status === "cancelled" && " · cancelled"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {showStatus && <MilestoneStatusPill status={m.status} />}
                    <span
                      className={cn(
                        "font-display text-lg font-semibold",
                        m.status === "cancelled" && "text-muted-foreground line-through"
                      )}
                    >
                      {formatPrice(m.amount)}
                    </span>
                  </div>
                </div>

                {m.description && (
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">{m.description}</p>
                )}
                {m.deliverables && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground/70">Deliverables: </span>
                    {m.deliverables}
                  </p>
                )}
                {m.revision_note && m.status === "revision_requested" && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <span className="font-semibold">Revision requested: </span>
                    {m.revision_note}
                  </div>
                )}
                {renderActions && <div className="mt-3">{renderActions(m)}</div>}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/70">
          <Lock className="h-3.5 w-3.5" />
          Total project value
        </span>
        <span className="font-display text-xl font-semibold">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
