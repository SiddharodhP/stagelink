"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Plus,
  Loader2,
} from "lucide-react";

import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  StatTile,
  Field,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/shared/dashboard-ui";
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
  InvoiceStatusPill,
  RecurrenceStatusPill,
  OverduePill,
  isOverdue,
} from "@/components/shared/invoice-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getMyInvoices } from "@/lib/services/invoices";
import {
  getMyRecurringInvoices,
  createRecurringInvoice,
  CADENCE_LABEL,
  CADENCE_NOUN,
} from "@/lib/services/recurring-invoices";
import { getMyContracts } from "@/lib/services/contracts";
import {
  Contract,
  Invoice,
  Profile,
  RecurringInvoice,
  RecurrenceCadence,
} from "@/types/marketplace";
import { formatPrice, formatDate, cn, displayName, partyName } from "@/lib/utils";

/**
 * Two tabs, because there are only two kinds of thing on this page: an
 * invoice, and a standing arrangement that issues them.
 *
 * Open, Overdue, Paid and All were four views of one list, and every row
 * already carries its own status pill, so the tabs were re-stating what the
 * rows say. What they did add was ordering -- the actionable invoices came
 * first because you were looking at a filtered view. The single list sorts
 * for that instead, see `sorted` below.
 */
const TABS = [
  { key: "invoices", label: "Invoices" },
  { key: "retainers", label: "Retainers" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const today = () => new Date().toISOString().slice(0, 10);

function InvoicesList({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [retainers, setRetainers] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("invoices");

  const isClient = profile.role === "client";

  // Retainer setup form
  const [setupOpen, setSetupOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contractId: "",
    title: "",
    amount: "",
    cadence: "monthly" as RecurrenceCadence,
    startsOn: today(),
    paymentTermsDays: "7",
    taxPercent: "0",
    description: "",
    endsOn: "",
    maxOccurrences: "",
  });

  const load = useCallback(async () => {
    const [inv, rec] = await Promise.all([
      getMyInvoices(profile.id),
      getMyRecurringInvoices(profile.id),
    ]);
    setInvoices(inv.data);
    setRetainers(rec.data);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openSetup = async () => {
    setSetupOpen(true);
    if (contracts.length) return;
    const { data } = await getMyContracts(profile.id);
    // Only contracts you're actively delivering can carry a retainer, and
    // only one live retainer is allowed per contract.
    const taken = new Set(
      retainers
        .filter((r) => ["pending_approval", "active", "paused"].includes(r.status))
        .map((r) => r.contract_id)
    );
    const eligible = data.filter(
      (c) =>
        c.status === "active" &&
        c.freelancer_id === profile.id &&
        !taken.has(c.id)
    );
    setContracts(eligible);
    setForm((f) => ({ ...f, contractId: eligible[0]?.id || "" }));
  };

  const submitRetainer = async () => {
    const amount = Math.round(Number(form.amount));
    if (!form.contractId) return toast.error("Pick a contract.");
    if (!form.title.trim()) return toast.error("Give the retainer a title.");
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error("Enter an amount greater than zero.");

    setSaving(true);
    const { id, error } = await createRecurringInvoice({
      contractId: form.contractId,
      title: form.title.trim(),
      amount,
      cadence: form.cadence,
      startsOn: form.startsOn || undefined,
      description: form.description.trim() || undefined,
      taxPercent: Number(form.taxPercent) || 0,
      paymentTermsDays: Number(form.paymentTermsDays) || 7,
      endsOn: form.endsOn || undefined,
      maxOccurrences: form.maxOccurrences
        ? Number(form.maxOccurrences)
        : undefined,
    });
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success("Retainer proposed — the client has to approve it before it bills.");
    setSetupOpen(false);
    if (id) router.push(`/invoices/recurring/${id}`);
  };

  const overdueInvoices = invoices.filter(isOverdue);

  /**
   * Overdue first, then anything still owed, then settled; newest within
   * each band. With the status tabs gone this is what keeps the invoice
   * that needs attention at the top of the page.
   */
  const statusRank = (i: Invoice) => {
    if (isOverdue(i)) return 0;
    if (["sent", "acknowledged"].includes(i.status)) return 1;
    if (i.status === "paid") return 2;
    return 3;
  };
  const sorted = [...invoices].sort(
    (a, b) =>
      statusRank(a) - statusRank(b) ||
      new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
  );

  const liveRetainers = retainers.filter((r) =>
    ["pending_approval", "active", "paused"].includes(r.status)
  );

  const counts = {
    invoices: invoices.length,
    retainers: retainers.length,
  };
  // No longer tabs, but the summary tiles and the tab badge still report
  // these numbers.
  const overdueCount = overdueInvoices.length;
  const openCount = invoices.filter((i) =>
    ["sent", "acknowledged"].includes(i.status)
  ).length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;

  const outstanding = invoices
    .filter((i) => ["sent", "acknowledged"].includes(i.status))
    .reduce((s, i) => s + i.total_amount, 0);
  const settled = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total_amount, 0);
  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.total_amount, 0);

  // What the active retainers commit to per month, roughly — weekly and
  // fortnightly are normalised so the number is comparable.
  const perMonth = retainers
    .filter((r) => r.status === "active")
    .reduce((s, r) => {
      const gross = r.amount + Math.round((r.amount * r.tax_percent) / 100);
      const factor =
        r.cadence === "weekly" ? 52 / 12 : r.cadence === "fortnightly" ? 26 / 12 : 1;
      return s + gross * factor;
    }, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={isClient ? "Client workspace" : "Freelancer workspace"}
        title="Invoices"
        description={
          isClient
            ? "Invoices your freelancers have issued — one-off milestones and ongoing retainers."
            : "Invoices you've issued, plus any recurring retainers billing on a schedule."
        }
        action={
          !isClient ? (
            <Button className="rounded-full bg-ink text-paper hover:bg-ink-soft" onClick={openSetup}>
              <Plus className="mr-2 h-4 w-4" /> New retainer
            </Button>
          ) : undefined
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={isClient ? "Awaiting payment" : "Outstanding"}
          value={formatPrice(outstanding)}
          icon={FileText}
          hint={`${openCount} invoice${openCount === 1 ? "" : "s"}`}
        />
        {overdueCount > 0 ? (
          <StatTile
            label="Overdue"
            value={formatPrice(overdueTotal)}
            icon={AlertTriangle}
            hint={`${overdueCount} past due`}
          />
        ) : (
          <StatTile
            label={isClient ? "Total paid" : "Total received"}
            value={formatPrice(settled)}
            icon={ArrowUpRight}
            hint={`${paidCount} settled`}
          />
        )}
        <StatTile
          label="Recurring"
          value={perMonth > 0 ? `${formatPrice(Math.round(perMonth))}/mo` : "—"}
          icon={RefreshCw}
          hint={`${liveRetainers.length} live retainer${liveRetainers.length === 1 ? "" : "s"}`}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-ink text-paper"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {t.label}
            <span className="ml-1.5 opacity-60">{counts[t.key]}</span>
            {/* Overdue lost its tab, so it gets a mark here instead. */}
            {t.key === "invoices" && overdueCount > 0 && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                  tab === t.key ? "bg-paper/20 text-paper" : "bg-red-50 text-red-700"
                )}
              >
                {overdueCount} overdue
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={3} height={92} />
      ) : tab === "retainers" ? (
        retainers.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            {retainers.map((r) => {
              const other = isClient ? r.freelancer : r.client;
              const gross = r.amount + Math.round((r.amount * r.tax_percent) / 100);
              return (
                <Link
                  key={r.id}
                  href={`/invoices/recurring/${r.id}`}
                  className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-secondary"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={displayName(other)}
                      src={other?.avatar_url}
                      size={36}
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {r.title}
                        <RecurrenceStatusPill status={r.status} />
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {CADENCE_LABEL[r.cadence]} · {r.project?.title || "Project"}
                        {r.status === "active"
                          ? ` · next ${formatDate(r.next_run_on)}`
                          : r.occurrences_created > 0
                            ? ` · ${r.occurrences_created} issued`
                            : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-display shrink-0 text-lg font-semibold">
                    {formatPrice(gross)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      /{CADENCE_NOUN[r.cadence]}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyCard
            icon={RefreshCw}
            title="No retainers yet"
            description={
              isClient
                ? "If a freelancer proposes an ongoing weekly or monthly arrangement, it shows up here for you to approve before anything is billed."
                : "Bill an ongoing client automatically every week, fortnight or month. Invoices are issued on schedule and chased if they go unpaid."
            }
            actionLabel={isClient ? "Browse freelancers" : undefined}
            actionHref={isClient ? "/discover" : undefined}
          />
        )
      ) : sorted.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {sorted.map((inv) => {
            const other = isClient ? inv.freelancer : inv.client;
            return (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-secondary"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    name={displayName(other)}
                    src={other?.avatar_url}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {inv.invoice_number}
                      {inv.kind === "recurring" && (
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <InvoiceStatusPill status={inv.status} />
                      <OverduePill invoice={inv} />
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {inv.milestone_title} · {inv.project_title}
                      {" · "}
                      {formatDate(inv.issued_at)}
                    </p>
                  </div>
                </div>
                <span className="font-display shrink-0 text-lg font-semibold">
                  {formatPrice(inv.total_amount)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={FileText}
          title="No invoices yet"
          description={
            isClient
              ? "When a freelancer delivers a milestone, their invoice appears here for you to acknowledge and pay."
              : "Deliver a milestone, then send an invoice from the contract page in one click."
          }
          actionLabel="View contracts"
          actionHref={isClient ? "/client/projects" : "/freelancer/contracts"}
        />
      )}

      {/* Retainer setup. Freelancer proposes; nothing bills until the
          client approves it on the retainer page. */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Set up a retainer</DialogTitle>
            <DialogDescription>
              Bills this client automatically on a schedule. Your client has to
              approve it first, and can pause or end it at any time.
            </DialogDescription>
          </DialogHeader>

          {contracts.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              You need an active contract to set up a retainer, and each contract
              can only have one. Accept a contract first, then come back.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <Field label="Contract" htmlFor="r_contract" required>
                <select
                  id="r_contract"
                  className={selectClass}
                  value={form.contractId}
                  onChange={(e) => setForm({ ...form, contractId: e.target.value })}
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.project?.title || "Project"} —{" "}
                      {partyName(c.client)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="What are you billing for?"
                htmlFor="r_title"
                required
                hint="Appears on every invoice this generates."
              >
                <input
                  id="r_title"
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Weekly social media retainer"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount per period" htmlFor="r_amount" required>
                  <input
                    id="r_amount"
                    type="number"
                    min={1}
                    className={inputClass}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="15000"
                  />
                </Field>
                <Field label="How often" htmlFor="r_cadence" required>
                  <select
                    id="r_cadence"
                    className={selectClass}
                    value={form.cadence}
                    onChange={(e) =>
                      setForm({ ...form, cadence: e.target.value as RecurrenceCadence })
                    }
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="First invoice on" htmlFor="r_start" required>
                  <input
                    id="r_start"
                    type="date"
                    min={today()}
                    className={inputClass}
                    value={form.startsOn}
                    onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
                  />
                </Field>
                <Field
                  label="Payment terms"
                  htmlFor="r_terms"
                  hint="Days to pay before it counts as overdue."
                >
                  <input
                    id="r_terms"
                    type="number"
                    min={0}
                    max={90}
                    className={inputClass}
                    value={form.paymentTermsDays}
                    onChange={(e) =>
                      setForm({ ...form, paymentTermsDays: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tax %" htmlFor="r_tax" hint="0 if not applicable.">
                  <input
                    id="r_tax"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className={inputClass}
                    value={form.taxPercent}
                    onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
                  />
                </Field>
                <Field
                  label="Stop after"
                  htmlFor="r_max"
                  hint="Optional — leave blank to run until cancelled."
                >
                  <input
                    id="r_max"
                    type="number"
                    min={1}
                    className={inputClass}
                    value={form.maxOccurrences}
                    onChange={(e) =>
                      setForm({ ...form, maxOccurrences: e.target.value })
                    }
                    placeholder="e.g. 12"
                  />
                </Field>
              </div>

              <Field
                label="What's included"
                htmlFor="r_desc"
                hint="Optional — appears on the invoice as the deliverables."
              >
                <textarea
                  id="r_desc"
                  className={`${textareaClass} min-h-[80px]`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="4 shoots per month, edited and delivered within 5 days."
                />
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setSetupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={saving || contracts.length === 0}
              onClick={submitRetainer}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoicesPage() {
  return <WorkspaceShellFree>{(profile) => <InvoicesList profile={profile} />}</WorkspaceShellFree>;
}
