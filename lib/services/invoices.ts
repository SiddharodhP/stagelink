import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Invoice } from "@/types/marketplace";

const supabase = createBrowserClient();

const INVOICE_SELECT = `
  *,
  freelancer:freelancer_id(id, full_name, avatar_url, headline, location, is_verified),
  client:client_id(id, full_name, avatar_url, company_name, location, is_verified)
`;

/** Every invoice the signed-in user is party to, newest first. */
export async function getMyInvoices(userId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .or(`freelancer_id.eq.${userId},client_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return { data: (data || []) as Invoice[], error };
}

export async function getInvoice(id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", id)
    .maybeSingle();
  return { data: data as Invoice | null, error };
}

/** Invoices attached to a contract — used inside the milestone workspace. */
export async function getContractInvoices(contractId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });
  return { data: (data || []) as Invoice[], error };
}

/* ---------- Server-validated lifecycle RPCs ---------- */

/** One click: amount, titles, and due date are all derived server-side. */
export async function createInvoice(
  milestoneId: string,
  taxPercent = 0,
  notes?: string
) {
  const { data, error } = await supabase.rpc("create_invoice", {
    p_milestone_id: milestoneId,
    p_tax_percent: taxPercent,
    p_notes: notes ?? null,
  });
  return { invoiceId: data as string | null, error };
}

export async function acknowledgeInvoice(invoiceId: string) {
  const { error } = await supabase.rpc("acknowledge_invoice", {
    p_invoice_id: invoiceId,
  });
  return { error };
}

/** Releases the milestone's escrow — delegates to approve_milestone in the DB. */
export async function payInvoice(invoiceId: string) {
  const { error } = await supabase.rpc("pay_invoice", { p_invoice_id: invoiceId });
  return { error };
}

export async function cancelInvoice(invoiceId: string) {
  const { error } = await supabase.rpc("cancel_invoice", { p_invoice_id: invoiceId });
  return { error };
}
