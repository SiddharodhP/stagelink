"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, BadgeCheck, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import {
  PageHeader,
  Field,
  SectionCard,
  inputClass,
} from "@/components/shared/dashboard-ui";
import {
  getMyPayoutAccount,
  setPayoutAccount,
  getMyPayouts,
  PAYOUT_STATUS_LABEL,
  type PayoutAccount,
  type PayoutMethod,
  type Payout,
} from "@/lib/services/payouts";
import { formatPrice, formatDate } from "@/lib/utils";

/**
 * Where a freelancer says how they want to be paid, and sees what they are
 * owed.
 *
 * The account number is never rendered back after saving -- the form starts
 * blank for bank details on a saved account and says what is on file in
 * words. Re-displaying it would mean sending it to the browser on every
 * visit for no benefit, since the only thing you can do with it here is
 * replace it.
 */

const UPI_RE = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function PayoutSettingsInner() {
  const router = useRouter();
  // Set when someone was sent here mid-task -- from the bid form, say. They
  // came to do one thing; put them back where they were rather than leaving
  // them to find their way.
  const next = useSearchParams().get("next");

  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [method, setMethod] = useState<PayoutMethod>("upi");
  const [upi, setUpi] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [confirmNumber, setConfirmNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [a, p] = await Promise.all([getMyPayoutAccount(), getMyPayouts()]);
      if (!alive) return;
      if (a.data) {
        setAccount(a.data);
        setMethod(a.data.method);
        setUpi(a.data.upi_vpa ?? "");
        setName(a.data.account_name ?? "");
        setIfsc(a.data.ifsc ?? "");
      }
      setPayouts(p.data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    if (method === "upi") {
      if (!UPI_RE.test(upi.trim())) {
        toast.error("That does not look like a UPI ID — it should read like name@bank");
        return;
      }
    } else {
      if (!name.trim()) return toast.error("The account holder's name is required");
      if (!number.trim()) return toast.error("The account number is required");
      // Typing it twice is the only check available here. A wrong account
      // number is not rejected by the bank -- it pays somebody else.
      if (number.trim() !== confirmNumber.trim()) {
        return toast.error("The two account numbers do not match");
      }
      if (!IFSC_RE.test(ifsc.trim().toUpperCase())) {
        return toast.error("That IFSC does not look right — 4 letters, a 0, then 6 characters");
      }
    }

    setSaving(true);
    const { error } = await setPayoutAccount({
      method,
      upi_vpa: method === "upi" ? upi.trim() : null,
      account_name: method === "bank" ? name.trim() : null,
      account_number: method === "bank" ? number.trim() : null,
      ifsc: method === "bank" ? ifsc.trim().toUpperCase() : null,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message || "Could not save your payout details");
      return;
    }
    toast.success("Payout details saved");
    setNumber("");
    setConfirmNumber("");
    const a = await getMyPayoutAccount();
    setAccount(a.data);

    if (next) router.push(next);
  };

  const owed = payouts
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <WorkspaceShellFree>
      <PageHeader
        eyebrow="Settings"
        title="Payouts"
        description="Where your money goes when a client approves a milestone."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {!account && (
            <div className="flex items-start gap-3 rounded-lg border border-freelancer/30 bg-freelancer-soft px-4 py-3.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-freelancer" />
              <p className="text-sm text-freelancer">
                You have not told us where to send your money yet. Approved
                milestones will still be recorded as owed to you, but nothing
                can be sent until this is filled in.
              </p>
            </div>
          )}

          <SectionCard
            title="How you get paid"
            description={
              account
                ? account.method === "upi"
                  ? `Currently paid to ${account.upi_vpa}`
                  : `Currently paid to the account ending ${(account.account_number ?? "").slice(-4)} at ${account.ifsc}`
                : undefined
            }
          >
            <div className="space-y-5">
              <div className="flex gap-2">
                {(["upi", "bank"] as PayoutMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                      method === m
                        ? "bg-freelancer-solid text-white"
                        : "border border-border text-muted-foreground hover:border-freelancer"
                    }`}
                  >
                    {m === "upi" ? "UPI" : "Bank account"}
                  </button>
                ))}
              </div>

              {method === "upi" ? (
                <Field label="UPI ID" htmlFor="upi" required hint="For example, yourname@okhdfcbank">
                  <input
                    id="upi"
                    className={inputClass}
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    placeholder="yourname@bank"
                    autoComplete="off"
                  />
                </Field>
              ) : (
                <>
                  <Field
                    label="Account holder's name"
                    htmlFor="acct-name"
                    required
                    hint="Exactly as it appears on your bank account."
                  >
                    <input
                      id="acct-name"
                      className={inputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="off"
                    />
                  </Field>

                  <Field
                    label="Account number"
                    htmlFor="acct-number"
                    required
                    hint={
                      account?.account_number
                        ? "Leave blank to keep the account already on file."
                        : undefined
                    }
                  >
                    <input
                      id="acct-number"
                      className={inputClass}
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      autoComplete="off"
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label="Confirm account number" htmlFor="acct-confirm" required>
                    <input
                      id="acct-confirm"
                      className={inputClass}
                      value={confirmNumber}
                      onChange={(e) => setConfirmNumber(e.target.value)}
                      autoComplete="off"
                      inputMode="numeric"
                      onPaste={(e) => {
                        // Pasting both fields from the same clipboard would
                        // confirm a typo rather than catch one.
                        e.preventDefault();
                        toast.info("Please type the account number again rather than pasting it");
                      }}
                    />
                  </Field>

                  <Field label="IFSC" htmlFor="ifsc" required hint="Eleven characters, like HDFC0001234.">
                    <input
                      id="ifsc"
                      className={`${inputClass} uppercase`}
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      autoComplete="off"
                      maxLength={11}
                    />
                  </Field>
                </>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Button onClick={save} disabled={saving} className="rounded-full">
                  {saving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Save payout details
                </Button>
                {account?.verified && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-freelancer" />
                    A payout has reached this account before
                  </span>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Your payouts"
            description={
              owed > 0
                ? `${formatPrice(owed)} released to you and not yet sent.`
                : "Money released by clients shows up here."
            }
          >
            {payouts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No payouts yet. One opens each time a client approves a milestone.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatPrice(p.amount)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.status === "paid" && p.paid_at
                          ? `Sent ${formatDate(p.paid_at)}${p.reference ? ` · ${p.reference}` : ""}`
                          : p.status === "failed"
                            ? p.failure_reason
                            : `Released ${formatDate(p.created_at)}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                        p.status === "paid"
                          ? "bg-freelancer-soft text-freelancer"
                          : p.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "border border-border text-muted-foreground"
                      }`}
                    >
                      {PAYOUT_STATUS_LABEL[p.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
    </WorkspaceShellFree>
  );
}

export default function PayoutSettingsPage() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole route
  // into client-side rendering.
  return (
    <Suspense fallback={null}>
      <PayoutSettingsInner />
    </Suspense>
  );
}
