"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Check,
  X,
  Pause,
  Play,
  CircleSlash,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";

import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
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
  Field,
  SkeletonRows,
  textareaClass,
} from "@/components/shared/dashboard-ui";
import {
  RecurrenceStatusPill,
  InvoiceStatusPill,
  OverduePill,
  isOverdue,
} from "@/components/shared/invoice-ui";
import { UserAvatar, NameWithBadge } from "@/components/shared/marketplace-ui";
import {
  getRecurringInvoice,
  getRecurringInvoiceHistory,
  respondRecurringInvoice,
  setRecurringPaused,
  endRecurringInvoice,
  CADENCE_LABEL,
  CADENCE_NOUN,
} from "@/lib/services/recurring-invoices";
import { Invoice, Profile, RecurringInvoice } from "@/types/marketplace";
import { formatPrice, formatDate, displayName, partyName } from "@/lib/utils";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function RetainerDetail({ profile }: { profile: Profile }) {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [retainer, setRetainer] = useState<RecurringInvoice | null>(null);
  const [history, setHistory] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [endReason, setEndReason] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data }, { data: rows }] = await Promise.all([
      getRecurringInvoice(id),
      getRecurringInvoiceHistory(id),
    ]);
    setRetainer(data);
    setHistory(rows as Invoice[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<{ error: any }>, success: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(success);
    load();
  };

  if (loading) return <SkeletonRows count={3} height={110} />;

  if (!retainer) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <h1 className="font-display mb-2 text-2xl font-semibold">Retainer not found</h1>
        <p className="mb-6 text-muted-foreground">
          It may have been removed, or it isn&apos;t yours to view.
        </p>
        <Button asChild className="rounded-full bg-ink text-paper hover:bg-ink-soft">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  const isClient = profile.id === retainer.client_id;
  const isFreelancer = profile.id === retainer.freelancer_id;
  const other = isClient ? retainer.freelancer : retainer.client;

  const tax = Math.round((retainer.amount * retainer.tax_percent) / 100);
  const gross = retainer.amount + tax;
  const per = CADENCE_NOUN[retainer.cadence];

  const needsApproval = isClient && retainer.status === "pending_approval";
  const canPause = retainer.status === "active";
  const canResume = retainer.status === "paused";
  const canEnd = ["pending_approval", "active", "paused"].includes(retainer.status);

  const billed = history
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total_amount, 0);
  const outstanding = history
    .filter((i) => ["sent", "acknowledged"].includes(i.status))
    .reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {canPause && (
            <Button
              variant="outline"
              className="rounded-full"
              disabled={busy}
              onClick={() =>
                run(() => setRecurringPaused(retainer.id, true), "Retainer paused")
              }
            >
              <Pause className="mr-2 h-4 w-4" /> Pause
            </Button>
          )}
          {canResume && (
            <Button
              variant="outline"
              className="rounded-full"
              disabled={busy}
              onClick={() =>
                run(() => setRecurringPaused(retainer.id, false), "Retainer resumed")
              }
            >
              <Play className="mr-2 h-4 w-4" /> Resume
            </Button>
          )}
          {canEnd && (
            <Button
              variant="outline"
              className="rounded-full text-rose-700 hover:text-rose-800"
              disabled={busy}
              onClick={() => setEndOpen(true)}
            >
              <CircleSlash className="mr-2 h-4 w-4" /> End
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="border-b border-border px-6 py-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="eyebrow">{CADENCE_LABEL[retainer.cadence]} retainer</span>
            <RecurrenceStatusPill status={retainer.status} />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {retainer.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {retainer.project?.title || "Project"}
          </p>

          <p className="font-display mt-5 text-4xl font-semibold">
            {formatPrice(gross)}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              per {per}
            </span>
          </p>
          {retainer.tax_percent > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPrice(retainer.amount)} + {retainer.tax_percent}% tax (
              {formatPrice(tax)})
            </p>
          )}
        </div>

        {/* What the client is agreeing to — stated before they can accept. */}
        {needsApproval && (
          <div className="border-b border-border bg-amber-50/60 px-6 py-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4" />
              {other?.full_name || "Your freelancer"} is proposing an ongoing retainer
            </p>
            <p className="mb-4 text-sm leading-relaxed text-foreground/80">
              If you approve, Roster will issue an invoice for{" "}
              <strong>{formatPrice(gross)}</strong> every {per}
              {retainer.max_occurrences
                ? `, up to ${retainer.max_occurrences} times`
                : ", until you or they end it"}
              , starting {formatDate(retainer.starts_on)}. Each invoice is payable
              within {retainer.payment_terms_days} days, after which you&apos;ll be
              reminded by email daily until it&apos;s settled. You can pause or end
              this at any time.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                disabled={busy}
                onClick={() =>
                  run(
                    () => respondRecurringInvoice(retainer.id, true),
                    "Retainer approved"
                  )
                }
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Approve retainer
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={busy}
                onClick={() =>
                  run(
                    () => respondRecurringInvoice(retainer.id, false),
                    "Retainer declined"
                  )
                }
              >
                <X className="mr-2 h-4 w-4" /> Decline
              </Button>
            </div>
          </div>
        )}

        {isFreelancer && retainer.status === "pending_approval" && (
          <div className="border-b border-border bg-secondary/60 px-6 py-4 text-sm text-muted-foreground">
            Waiting for {other?.full_name || "the client"} to approve. Nothing is
            billed until they do.
          </div>
        )}

        <div className="grid grid-cols-2 gap-5 border-b border-border px-6 py-5 sm:grid-cols-4">
          <Detail
            label="Next invoice"
            value={
              retainer.status === "active"
                ? formatDate(retainer.next_run_on)
                : retainer.status === "paused"
                  ? "Paused"
                  : "—"
            }
          />
          <Detail label="Started" value={formatDate(retainer.starts_on)} />
          <Detail
            label="Ends"
            value={
              retainer.ends_on
                ? formatDate(retainer.ends_on)
                : retainer.max_occurrences
                  ? `After ${retainer.max_occurrences}`
                  : "Open-ended"
            }
          />
          <Detail
            label="Issued so far"
            value={`${retainer.occurrences_created}`}
          />
          <Detail label="Payment terms" value={`Net ${retainer.payment_terms_days}`} />
          <Detail label="Collected" value={formatPrice(billed)} />
          <Detail
            label="Outstanding"
            value={
              outstanding > 0 ? (
                <span className="text-rose-700">{formatPrice(outstanding)}</span>
              ) : (
                formatPrice(0)
              )
            }
          />
          {retainer.ended_at && (
            <Detail
              label="Ended"
              value={`${formatDate(retainer.ended_at)}${
                retainer.end_reason ? ` · ${retainer.end_reason}` : ""
              }`}
            />
          )}
        </div>

        {retainer.description && (
          <div className="border-b border-border px-6 py-5">
            <p className="eyebrow mb-2">What&apos;s included</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {retainer.description}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-6 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={displayName(other)}
              src={other?.avatar_url}
              size={40}
            />
            <div>
              <p className="eyebrow mb-0.5">{isClient ? "Freelancer" : "Client"}</p>
              <NameWithBadge
                name={
                  isClient ? displayName(other) : partyName(other)
                }
                verified={other?.is_verified}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 px-6 py-5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            Payment is collected and passed on by Roster. Each invoice moves
            money from the client to the platform and on to the freelancer, so
            neither side is transferring funds directly.
          </p>
        </div>
      </div>

      {/* Invoices this schedule has produced */}
      <div className="mt-8">
        <h2 className="font-display mb-3 text-xl font-semibold">
          Invoices issued
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {history.length}
          </span>
        </h2>

        {history.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            {history.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-secondary"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {inv.invoice_number}
                    <InvoiceStatusPill status={inv.status} />
                    <OverduePill invoice={inv} />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {inv.period_start && inv.period_end
                      ? `${formatDate(inv.period_start)} – ${formatDate(inv.period_end)}`
                      : formatDate(inv.issued_at)}
                    {inv.due_date && !isOverdue(inv) && inv.status !== "paid"
                      ? ` · due ${formatDate(inv.due_date)}`
                      : ""}
                    {(inv.reminders_sent ?? 0) > 0
                      ? ` · ${inv.reminders_sent} reminder${inv.reminders_sent === 1 ? "" : "s"} sent`
                      : ""}
                  </p>
                </div>
                <span className="font-display shrink-0 text-lg font-semibold">
                  {formatPrice(inv.total_amount)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
            {retainer.status === "pending_approval"
              ? "Nothing has been billed yet — the first invoice goes out once the client approves."
              : `The first invoice will be issued on ${formatDate(retainer.next_run_on)}.`}
          </div>
        )}
      </div>

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">End this retainer</DialogTitle>
            <DialogDescription>
              No further invoices will be issued. Invoices already sent still
              stand and remain payable. This can&apos;t be undone — you&apos;d
              need to set up a new retainer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Field label="Reason" htmlFor="end_reason" hint="Optional — shared with the other party.">
              <textarea
                id="end_reason"
                className={`${textareaClass} min-h-[80px]`}
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                placeholder="Project wrapped up."
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setEndOpen(false)}
            >
              Keep it
            </Button>
            <Button
              className="rounded-full bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy}
              onClick={async () => {
                await run(
                  () => endRecurringInvoice(retainer.id, endReason.trim() || undefined),
                  "Retainer ended"
                );
                setEndOpen(false);
              }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              End retainer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RecurringInvoicePage() {
  return (
    <WorkspaceShellFree>{(profile) => <RetainerDetail profile={profile} />}</WorkspaceShellFree>
  );
}
