"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, Send, Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, inputClass, textareaClass } from "@/components/shared/dashboard-ui";
import { upsertMilestones } from "@/lib/services/projects";
import { submitMilestonePlan } from "@/lib/services/contracts";
import { Contract, Milestone } from "@/types/marketplace";
import { formatPrice } from "@/lib/utils";

interface Draft {
  key: string;
  title: string;
  description: string;
  deliverables: string;
  amount: string;
  due_date: string;
}

function blank(): Draft {
  return {
    key: crypto.randomUUID(),
    title: "",
    description: "",
    deliverables: "",
    amount: "",
    due_date: "",
  };
}

/**
 * The client drafts the milestone plan here, after choosing a freelancer
 * and talking to them.
 *
 * Milestones used to be invented at posting time, before the client had
 * met anyone — which meant staging work nobody had discussed yet. This is
 * the moment the plan can actually be informed.
 *
 * Sending it locks the structure. The freelancer is about to agree to
 * these exact terms, so they must not be editable underneath that
 * agreement.
 */
export function MilestonePlanner({
  contract,
  existing,
  conversationId,
  onSent,
}: {
  contract: Contract;
  existing: Milestone[];
  conversationId?: string | null;
  onSent: () => void;
}) {
  const [rows, setRows] = useState<Draft[]>(
    existing.length > 0
      ? existing.map((m) => ({
          key: m.id,
          title: m.title,
          description: m.description || "",
          deliverables: m.deliverables || "",
          amount: String(m.amount),
          due_date: m.due_date || "",
        }))
      : [blank()]
  );
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const quoted = contract.agreed_amount || 0;
  const drift = total - quoted;

  const update = (key: string, patch: Partial<Draft>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const validate = () => {
    if (rows.length === 0) return "Add at least one milestone";
    for (const r of rows) {
      if (!r.title.trim()) return "Every milestone needs a title";
      if (!Number(r.amount) || Number(r.amount) <= 0) {
        return "Every milestone needs an amount above zero";
      }
    }
    return null;
  };

  const persist = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return false;
    }
    const { error } = await upsertMilestones(
      contract.project_id,
      rows.map((r) => ({
        title: r.title.trim(),
        description: r.description.trim() || null,
        deliverables: r.deliverables.trim() || null,
        amount: Number(r.amount),
        due_date: r.due_date || null,
      }))
    );
    if (error) {
      toast.error(error.message || "Could not save the plan");
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (ok) toast.success("Draft saved");
  };

  const send = async () => {
    setSending(true);
    if (!(await persist())) {
      setSending(false);
      return;
    }
    const { error } = await submitMilestonePlan(contract.id);
    setSending(false);
    if (error) {
      toast.error(error.message || "Could not send the plan");
      return;
    }
    toast.success("Plan sent — the freelancer will confirm it");
    onSent();
  };

  return (
    <div className="space-y-5">
      {conversationId && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3">
          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Talk the work through before you write the plan — scope, dates,
            what counts as done.
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={`/messages?c=${conversationId}`}>Open chat</Link>
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.key} className="rounded-xl border border-border bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
                {i + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  className="text-muted-foreground transition-colors hover:text-rose-600"
                  aria-label={`Remove milestone ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <Field label="What happens in this stage" htmlFor={`t-${r.key}`} required>
                <input
                  id={`t-${r.key}`}
                  className={inputClass}
                  value={r.title}
                  onChange={(e) => update(r.key, { title: e.target.value })}
                  placeholder="e.g. Half-day studio shoot"
                />
              </Field>

              <Field
                label="Deliverables"
                htmlFor={`d-${r.key}`}
                hint="What the freelancer hands over. This is what you approve against."
              >
                <textarea
                  id={`d-${r.key}`}
                  className={`${textareaClass} min-h-[70px]`}
                  value={r.deliverables}
                  onChange={(e) => update(r.key, { deliverables: e.target.value })}
                  placeholder="e.g. 40 edited hi-res images, delivered via gallery link"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Amount ($)" htmlFor={`a-${r.key}`} required>
                  <input
                    id={`a-${r.key}`}
                    type="number"
                    min={1}
                    className={inputClass}
                    value={r.amount}
                    onChange={(e) => update(r.key, { amount: e.target.value })}
                  />
                </Field>
                <Field label="Due date" htmlFor={`due-${r.key}`}>
                  <input
                    id={`due-${r.key}`}
                    type="date"
                    className={inputClass}
                    value={r.due_date}
                    onChange={(e) => update(r.key, { due_date: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full rounded-full"
        onClick={() => setRows((rs) => [...rs, blank()])}
      >
        <Plus className="mr-2 h-4 w-4" /> Add another milestone
      </Button>

      <div className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">Plan total</span>
          <span className="font-display text-2xl font-semibold">
            {formatPrice(total)}
          </span>
        </div>
        {quoted > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            They bid {formatPrice(quoted)}.{" "}
            {drift === 0 ? (
              "The plan matches."
            ) : (
              <span className={drift > 0 ? "text-amber-700" : "text-emerald-700"}>
                This plan is {formatPrice(Math.abs(drift))}{" "}
                {drift > 0 ? "above" : "below"} their bid — worth agreeing in
                chat first.
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          className="rounded-full bg-ink px-8 text-paper hover:bg-ink-soft"
          disabled={sending || saving}
          onClick={send}
        >
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send plan for confirmation
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={saving || sending}
          onClick={saveDraft}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save draft
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Once sent, the plan is locked while the freelancer reviews it. If they
        ask for changes it comes back here to edit.
      </p>
    </div>
  );
}
