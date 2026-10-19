"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Banknote, Loader2, ArrowUpRight, Copy, AlertCircle } from "lucide-react";

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
  inputClass,
  textareaClass,
} from "@/components/shared/dashboard-ui";
import {
  getPayoutQueueDetailed,
  recordPayoutSent,
  recordPayoutFailed,
  getRefundQueue,
  recordRefundSent,
  recordRefundFailed,
  type PayoutQueueRow,
  type RefundQueueRow,
} from "@/lib/services/payouts";
import { formatPrice, formatDate, displayName } from "@/lib/utils";

/**
 * The payout queue: everything a client has approved and the platform has
 * not yet sent.
 *
 * This page does not move money. It shows what is owed and to where, and
 * records what was sent once it has been. That split is deliberate -- the
 * same two actions serve a bank transfer made by hand today and a provider
 * webhook later, so adding an automated rail does not change this screen or
 * anything underneath it.
 */

function AdminPayouts() {
  const [rows, setRows] = useState<PayoutQueueRow[]>([]);
  const [refunds, setRefunds] = useState<RefundQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<PayoutQueueRow | null>(null);
  const [failing, setFailing] = useState<PayoutQueueRow | null>(null);
  const [sendingRefund, setSendingRefund] = useState<RefundQueueRow | null>(null);
  const [failingRefund, setFailingRefund] = useState<RefundQueueRow | null>(null);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, r] = await Promise.all([getPayoutQueueDetailed(), getRefundQueue()]);
    if (p.error) toast.error(p.error.message || "Could not load the payout queue");
    if (r.error) toast.error(r.error.message || "Could not load the refund queue");
    setRows(p.data);
    setRefunds(r.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const confirmSent = async () => {
    if (!sending) return;
    if (!reference.trim()) {
      toast.error("A UTR or transaction reference is required");
      return;
    }
    setBusy(true);
    const { error } = await recordPayoutSent(sending.id, reference.trim(), "manual");
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not record the payout");
      return;
    }
    toast.success("Payout recorded");
    setSending(null);
    setReference("");
    load();
  };

  const confirmFailed = async () => {
    if (!failing) return;
    if (!reason.trim()) {
      toast.error("Say what went wrong — the freelancer sees this");
      return;
    }
    setBusy(true);
    const { error } = await recordPayoutFailed(failing.id, reason.trim());
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not record the failure");
      return;
    }
    toast.success("Marked as failed");
    setFailing(null);
    setReason("");
    load();
  };

  const confirmRefundSent = async () => {
    if (!sendingRefund) return;
    if (!reference.trim()) {
      toast.error("A refund reference is required");
      return;
    }
    setBusy(true);
    const { error } = await recordRefundSent(sendingRefund.id, reference.trim(), "manual");
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not record the refund");
      return;
    }
    toast.success("Refund recorded");
    setSendingRefund(null);
    setReference("");
    load();
  };

  const confirmRefundFailed = async () => {
    if (!failingRefund) return;
    if (!reason.trim()) {
      toast.error("Say what went wrong");
      return;
    }
    setBusy(true);
    const { error } = await recordRefundFailed(failingRefund.id, reason.trim());
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not record the failure");
      return;
    }
    toast.success("Marked as failed");
    setFailingRefund(null);
    setReason("");
    load();
  };

  const owed = rows.reduce((sum, r) => sum + r.amount, 0);

  const destination = (row: PayoutQueueRow) => {
    const a = row.account;
    if (!a) return null;
    if (a.method === "upi") return a.upi_vpa ?? null;
    return `${a.account_name} · ${a.account_number} · ${a.ifsc}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Payouts"
        description={
          loading
            ? "Money released to freelancers and not yet sent."
            : `${formatPrice(owed)} across ${rows.length} payout${rows.length === 1 ? "" : "s"} waiting to be sent.`
        }
      />

      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <EmptyCard
          icon={Banknote}
          title="Nothing to pay out"
          description="Approved milestones appear here until the money has been sent."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const dest = destination(row);
            return (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {formatPrice(row.amount)}
                      </p>
                      <span className="text-sm text-muted-foreground">to</span>
                      <Link
                        href={`/u/${row.payee_id}`}
                        className="inline-flex items-center gap-1 text-sm text-freelancer hover:underline"
                      >
                        {displayName(row.payee)}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                      {row.status === "failed" && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          Failed
                        </span>
                      )}
                      {row.status === "processing" && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          Sending
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {row.milestone?.title}
                      {row.project?.title ? ` · ${row.project.title}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Released {formatDate(row.created_at)}
                    </p>

                    {row.status === "failed" && row.failure_reason && (
                      <p className="mt-2 text-xs text-destructive">
                        {row.failure_reason}
                      </p>
                    )}

                    {/* Where to send it. Shown in full because this is the
                        screen where somebody types it into a banking app;
                        masking it here would make the page useless. */}
                    {dest ? (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(dest);
                          toast.success("Copied");
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-mono text-xs text-foreground hover:border-freelancer"
                      >
                        <Copy className="h-3 w-3" />
                        {dest}
                      </button>
                    ) : (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        No payout details on file — they have been asked to add them
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setFailing(row)}
                    >
                      Couldn&apos;t send
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full"
                      disabled={!dest}
                      onClick={() => setSending(row)}
                    >
                      Mark as sent
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Refunds: money owed back to a client after a dispute ---- */}
      {!loading && refunds.length > 0 && (
        <div className="mt-10 space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Refunds owed</h2>
            <p className="text-sm text-muted-foreground">
              {formatPrice(refunds.reduce((sum, r) => sum + r.amount, 0))} to be
              returned to clients. A refund goes back the way it came, so there
              is no account to enter — refund it through the provider that took
              it, then record the reference here.
            </p>
          </div>

          {refunds.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {formatPrice(r.amount)}
                    </p>
                    <span className="text-sm text-muted-foreground">back to</span>
                    <Link
                      href={`/u/${r.payee_id}`}
                      className="inline-flex items-center gap-1 text-sm text-client hover:underline"
                    >
                      {displayName(r.payee)}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                    {r.status === "failed" && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                        Failed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {r.milestone?.title}
                    {r.project?.title ? ` · ${r.project.title}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.reason || "Refund owed"} · {formatDate(r.created_at)}
                  </p>
                  {r.status === "failed" && r.failure_reason && (
                    <p className="mt-2 text-xs text-destructive">{r.failure_reason}</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setFailingRefund(r)}
                  >
                    Couldn&apos;t send
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => setSendingRefund(r)}
                  >
                    Mark as refunded
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Record a payout ---- */}
      <Dialog open={!!sending} onOpenChange={(o) => !o && setSending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record this payout</DialogTitle>
            <DialogDescription>
              {sending
                ? `${formatPrice(sending.amount)} to ${displayName(sending.payee)}. Enter the reference your bank gave you — the freelancer sees it, and it is how this payment gets traced later.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <Field label="UTR or transaction reference" htmlFor="utr" required>
            <input
              id="utr"
              className={inputClass}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 412345678901"
              autoComplete="off"
            />
          </Field>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSending(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={confirmSent} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirm sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Record a failure ---- */}
      <Dialog open={!!failing} onOpenChange={(o) => !o && setFailing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Couldn&apos;t send this payout</DialogTitle>
            <DialogDescription>
              The freelancer is shown this reason, so write it for them rather
              than for the log.
            </DialogDescription>
          </DialogHeader>

          <Field label="What went wrong" htmlFor="reason" required>
            <textarea
              id="reason"
              className={textareaClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="The bank rejected the transfer — the account number and IFSC do not match."
            />
          </Field>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFailing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmFailed} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Mark as failed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Record a refund ---- */}
      <Dialog open={!!sendingRefund} onOpenChange={(o) => !o && setSendingRefund(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record this refund</DialogTitle>
            <DialogDescription>
              {sendingRefund
                ? `${formatPrice(sendingRefund.amount)} back to ${displayName(sendingRefund.payee)}. Enter the reference from the provider you refunded through.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <Field label="Refund reference" htmlFor="refund-ref" required>
            <input
              id="refund-ref"
              className={inputClass}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. rfnd_XXXXXXXXXXXX"
              autoComplete="off"
            />
          </Field>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendingRefund(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={confirmRefundSent} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirm refunded
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Record a failed refund ---- */}
      <Dialog open={!!failingRefund} onOpenChange={(o) => !o && setFailingRefund(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Couldn&apos;t send this refund</DialogTitle>
            <DialogDescription>
              Write it for the client, who is owed this money and will want to
              know why it has not arrived.
            </DialogDescription>
          </DialogHeader>

          <Field label="What went wrong" htmlFor="refund-reason" required>
            <textarea
              id="refund-reason"
              className={textareaClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFailingRefund(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRefundFailed} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Mark as failed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminPayoutsPage() {
  return <WorkspaceShell role="admin">{() => <AdminPayouts />}</WorkspaceShell>;
}
