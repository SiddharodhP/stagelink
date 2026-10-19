"use client";

import { useEffect, useState } from "react";
import { Loader2, Paperclip, FileText, Receipt, AlertCircle } from "lucide-react";

import { getDisputeEvidence } from "@/lib/services/admin";
import { formatPrice, formatDate } from "@/lib/utils";

/**
 * The evidence behind a dispute, for the person deciding it.
 *
 * A dispute row says someone is unhappy. It does not say what was agreed,
 * what was delivered, or whether the money ever arrived -- and "release or
 * refund" is not a decision anyone should make without those three. So this
 * puts them in one place:
 *
 *   AGREED     the milestone's description and deliverables, as written when
 *              the work was planned rather than as remembered during an
 *              argument
 *   DELIVERED  every submission, in order, with its attachment
 *   REJECTED   the revision note, if the client sent one back
 *   MONEY      what actually moved, with the provider's reference
 *
 * Loaded on demand rather than with the dispute list: most disputes in the
 * list are not the one being read, and fetching four tables for each of them
 * would be work nobody asked for.
 */

type Props = { milestoneId: string };

type Evidence = Awaited<ReturnType<typeof getDisputeEvidence>>;

export function DisputeEvidence({ milestoneId }: Props) {
  const [data, setData] = useState<Evidence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDisputeEvidence(milestoneId).then((d) => {
      if (!alive) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [milestoneId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <p className="py-4 text-sm text-destructive">
        Could not load the evidence for this milestone.
      </p>
    );
  }

  const { milestone: m, submissions, transactions } = data;

  return (
    <div className="space-y-5 border-t border-border pt-5">
      {/* ---- What was agreed ---- */}
      <section>
        <h4 className="eyebrow mb-2 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> What was agreed
        </h4>
        {m?.description || m?.deliverables ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            {m.description && <p>{m.description}</p>}
            {m.deliverables && (
              <p>
                <span className="text-foreground">Deliverables: </span>
                {m.deliverables}
              </p>
            )}
            {m.due_date && (
              <p className="text-xs">Due {formatDate(m.due_date)}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing was written down beyond the title — worth weighing, since
            neither side agreed to anything specific.
          </p>
        )}
      </section>

      {/* ---- What was delivered ---- */}
      <section>
        <h4 className="eyebrow mb-2 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> What was delivered
          <span className="font-normal normal-case tracking-normal text-muted-foreground">
            ({submissions.length})
          </span>
        </h4>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing was ever submitted for this milestone.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {submissions.map((s, i) => (
              <li
                key={s.id}
                className="rounded-md border border-border bg-background/40 px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Submission {i + 1} · {formatDate(s.created_at)}
                  </span>
                  {s.attachment_url && (
                    <a
                      href={s.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-freelancer hover:underline"
                    >
                      <Paperclip className="h-3 w-3" /> Attachment
                    </a>
                  )}
                </div>
                {s.note && <p className="mt-1 text-sm text-foreground">{s.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ---- Why it was sent back ---- */}
      {m?.revision_note && (
        <section>
          <h4 className="eyebrow mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> Why the client sent it back
          </h4>
          <p className="rounded-md border border-border bg-background/40 px-3 py-2.5 text-sm text-foreground">
            {m.revision_note}
          </p>
        </section>
      )}

      {/* ---- What the money did ---- */}
      <section>
        <h4 className="eyebrow mb-2 flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5" /> Money
        </h4>
        <p className="mb-2 text-sm">
          {m?.escrow_funded ? (
            <span className="text-foreground">
              {formatPrice(m.amount)} was funded
              {m.funded_at ? ` on ${formatDate(m.funded_at)}` : ""}.
            </span>
          ) : (
            // Worth stating loudly: a refund of money that never arrived is
            // not a refund, and this changes which outcomes make sense.
            <span className="text-destructive">
              This milestone was never funded — there is nothing in escrow to
              release or refund.
            </span>
          )}
        </p>
        {transactions.length > 0 && (
          <ul className="space-y-1">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
              >
                <span>
                  {t.type} · {formatDate(t.created_at)}
                  {t.reference ? ` · ${t.reference}` : ""}
                </span>
                <span className="font-mono">{formatPrice(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
