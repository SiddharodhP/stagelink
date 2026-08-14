"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldAlert, Loader2, ArrowUpRight } from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  Field,
  textareaClass,
} from "@/components/shared/dashboard-ui";
import { getDisputes, resolveDispute, markDisputeUnderReview } from "@/lib/services/admin";
import { Dispute } from "@/types/marketplace";
import { formatPrice, formatDate, cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  open: "border-red-200 bg-red-50 text-red-700",
  under_review: "border-amber-200 bg-amber-50 text-amber-800",
  resolved: "border-border bg-secondary text-foreground/70",
};

function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Dispute | null>(null);
  const [outcome, setOutcome] = useState<"release" | "refund">("release");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    getDisputes().then(({ data }) => {
      setDisputes(data);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const claim = async (d: Dispute) => {
    const { error } = await markDisputeUnderReview(d.id);
    if (error) return toast.error(error.message || "Could not update");
    setDisputes((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, status: "under_review" as const } : x))
    );
    toast.success("Marked under review");
  };

  const resolve = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await resolveDispute(target.id, outcome, note.trim());
    setBusy(false);
    if (error) return toast.error(error.message || "Could not resolve");
    toast.success(
      outcome === "release"
        ? "Escrow released to the freelancer"
        : "Escrow refunded to the client"
    );
    setTarget(null);
    setNote("");
    load();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Admin"
        title="Disputes"
        description="Resolve milestone disputes by releasing escrow or refunding the client."
      />

      {loading ? (
        <SkeletonRows count={3} height={140} />
      ) : disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map((d) => {
            const c = d.contract as any;
            return (
              <article key={d.id} className="rounded-xl border border-border bg-white p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2.5">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
                          STATUS_TONE[d.status]
                        )}
                      >
                        {d.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Raised {formatDate(d.created_at)} by {d.raiser?.full_name} (
                        {d.raiser?.role})
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold leading-snug">
                      {d.reason}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c?.project?.title} · milestone “{d.milestone?.title}”
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-display text-xl font-semibold leading-none">
                      {formatPrice(d.milestone?.amount || 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">in escrow</p>
                  </div>
                </div>

                {d.details && (
                  <p className="mb-4 rounded-lg bg-secondary p-4 text-sm leading-relaxed text-foreground/85">
                    {d.details}
                  </p>
                )}

                <dl className="mb-4 grid grid-cols-2 gap-4 border-y border-border py-3 text-sm">
                  <div>
                    <dt className="eyebrow mb-0.5">Client</dt>
                    <dd className="font-medium">{c?.client?.full_name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-0.5">Freelancer</dt>
                    <dd className="font-medium">{c?.freelancer?.full_name || "—"}</dd>
                  </div>
                </dl>

                {d.status === "resolved" ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Resolution:</span>{" "}
                    {d.resolution_note || "—"}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                      onClick={() => setTarget(d)}
                    >
                      Resolve dispute
                    </Button>
                    {d.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => claim(d)}
                      >
                        Mark under review
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost" className="rounded-full text-muted-foreground">
                      <Link href={`/contracts/${d.contract_id}`}>
                        View contract <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={ShieldAlert}
          title="No disputes"
          description="When a client or freelancer escalates a milestone, it appears here for review."
        />
      )}

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Resolve dispute</DialogTitle>
            <DialogDescription>
              This moves the escrowed{" "}
              {target ? formatPrice(target.milestone?.amount || 0) : ""} and closes the
              dispute. The decision is recorded in the ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field label="Outcome" required>
              <div className="space-y-2">
                {[
                  {
                    value: "release" as const,
                    label: "Release to freelancer",
                    hint: "The work was delivered as agreed.",
                  },
                  {
                    value: "refund" as const,
                    label: "Refund the client",
                    hint: "The milestone is cancelled and funds returned.",
                  },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOutcome(o.value)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      outcome === o.value ? "border-ink bg-secondary" : "border-border hover:border-ink/40"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        outcome === o.value ? "border-ink" : "border-foreground/30"
                      )}
                    >
                      {outcome === o.value && <span className="h-2 w-2 rounded-full bg-ink" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Resolution note" required>
              <textarea
                className={textareaClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain the decision — both parties will see this."
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={busy || !note.trim()}
              onClick={resolve}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDisputesPage() {
  return <WorkspaceShell role="admin">{() => <AdminDisputes />}</WorkspaceShell>;
}
