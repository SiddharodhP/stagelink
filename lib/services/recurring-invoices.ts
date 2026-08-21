import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { RecurringInvoice, RecurrenceCadence } from "@/types/marketplace";

const supabase = createBrowserClient();

const RECURRING_SELECT = `
  *,
  freelancer:freelancer_id(id, full_name, avatar_url, headline, location, is_verified),
  client:client_id(id, full_name, avatar_url, company_name, location, is_verified),
  project:project_id(id, title)
`;

/** Every retainer the signed-in user is party to, newest first. */
export async function getMyRecurringInvoices(userId: string) {
  const { data, error } = await supabase
    .from("recurring_invoices")
    .select(RECURRING_SELECT)
    .or(`freelancer_id.eq.${userId},client_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return { data: (data || []) as RecurringInvoice[], error };
}

export async function getRecurringInvoice(id: string) {
  const { data, error } = await supabase
    .from("recurring_invoices")
    .select(RECURRING_SELECT)
    .eq("id", id)
    .maybeSingle();
  return { data: data as RecurringInvoice | null, error };
}

/** The live retainer on a contract, if there is one. */
export async function getContractRecurring(contractId: string) {
  const { data, error } = await supabase
    .from("recurring_invoices")
    .select(RECURRING_SELECT)
    .eq("contract_id", contractId)
    .in("status", ["pending_approval", "active", "paused"])
    .maybeSingle();
  return { data: data as RecurringInvoice | null, error };
}

/** Invoices this schedule has issued so far. */
export async function getRecurringInvoiceHistory(scheduleId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("recurring_invoice_id", scheduleId)
    .order("period_start", { ascending: false });
  return { data: data || [], error };
}

/* ---------- Server-validated lifecycle RPCs ---------- */

/**
 * Freelancer proposes a retainer. It bills nothing until the client
 * accepts — the schedule is created in 'pending_approval'.
 */
export async function createRecurringInvoice(input: {
  contractId: string;
  title: string;
  amount: number;
  cadence: RecurrenceCadence;
  startsOn?: string;
  description?: string;
  taxPercent?: number;
  paymentTermsDays?: number;
  endsOn?: string;
  maxOccurrences?: number;
}) {
  const { data, error } = await supabase.rpc("create_recurring_invoice", {
    p_contract_id: input.contractId,
    p_title: input.title,
    p_amount: input.amount,
    p_cadence: input.cadence,
    p_starts_on: input.startsOn ?? null,
    p_description: input.description ?? null,
    p_tax_percent: input.taxPercent ?? 0,
    p_payment_terms_days: input.paymentTermsDays ?? 7,
    p_ends_on: input.endsOn ?? null,
    p_max_occurrences: input.maxOccurrences ?? null,
  });
  return { id: data as string | null, error };
}

/** Client accepts or declines the proposal. */
export async function respondRecurringInvoice(id: string, accept: boolean) {
  const { error } = await supabase.rpc("respond_recurring_invoice", {
    p_id: id,
    p_accept: accept,
  });
  return { error };
}

/** Either party can pause or resume. Resuming never back-bills. */
export async function setRecurringPaused(id: string, paused: boolean) {
  const { error } = await supabase.rpc("set_recurring_invoice_paused", {
    p_id: id,
    p_paused: paused,
  });
  return { error };
}

/** Ends the schedule for good. Invoices already issued still stand. */
export async function endRecurringInvoice(id: string, reason?: string) {
  const { error } = await supabase.rpc("end_recurring_invoice", {
    p_id: id,
    p_reason: reason ?? null,
  });
  return { error };
}

/* ---------- Presentation helpers ---------- */

export const CADENCE_LABEL: Record<RecurrenceCadence, string> = {
  weekly: "Weekly",
  fortnightly: "Every 2 weeks",
  monthly: "Monthly",
};

export const CADENCE_NOUN: Record<RecurrenceCadence, string> = {
  weekly: "week",
  fortnightly: "fortnight",
  monthly: "month",
};
