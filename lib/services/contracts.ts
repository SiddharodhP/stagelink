import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  Contract,
  Milestone,
  MilestoneSubmission,
  Transaction,
} from "@/types/marketplace";

const supabase = createBrowserClient();

const CONTRACT_SELECT = `
  *,
  project:project_id(*, category:category_id(id, name, slug)),
  client:client_id(id, full_name, avatar_url, company_name, location, is_verified),
  freelancer:freelancer_id(id, full_name, headline, avatar_url, location, is_verified),
  bid:bid_id(*)
`;

export async function getContract(id: string) {
  const { data, error } = await supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq("id", id)
    .maybeSingle();
  return { data: data as Contract | null, error };
}

export async function getMyContracts(userId: string) {
  const { data, error } = await supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return { data: (data || []) as Contract[], error };
}

export async function getContractMilestones(projectId: string) {
  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("seq");
  return { data: (data || []) as Milestone[], error };
}

export async function getMilestoneSubmissions(contractId: string) {
  const { data, error } = await supabase
    .from("milestone_submissions")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });
  return { data: (data || []) as MilestoneSubmission[], error };
}

export async function getMyTransactions(userId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, project:project_id(title), milestone:milestone_id(title)")
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return { data: (data || []) as Transaction[], error };
}

/* ---------- Server-validated lifecycle RPCs ---------- */

export async function respondContract(contractId: string, accept: boolean) {
  const { error } = await supabase.rpc("respond_contract", {
    p_contract_id: contractId,
    p_accept: accept,
  });
  return { error };
}

export async function fundMilestone(milestoneId: string) {
  const { error } = await supabase.rpc("fund_milestone", { p_milestone_id: milestoneId });
  return { error };
}

export async function submitMilestone(milestoneId: string, note: string, attachmentUrl: string | null) {
  const { error } = await supabase.rpc("submit_milestone", {
    p_milestone_id: milestoneId,
    p_note: note,
    p_attachment_url: attachmentUrl,
  });
  return { error };
}

export async function approveMilestone(milestoneId: string) {
  const { error } = await supabase.rpc("approve_milestone", { p_milestone_id: milestoneId });
  return { error };
}

export async function requestRevision(milestoneId: string, note: string) {
  const { error } = await supabase.rpc("request_revision", {
    p_milestone_id: milestoneId,
    p_note: note,
  });
  return { error };
}

export async function openDispute(milestoneId: string, reason: string, details: string) {
  const { data, error } = await supabase.rpc("open_dispute", {
    p_milestone_id: milestoneId,
    p_reason: reason,
    p_details: details,
  });
  return { disputeId: data as string | null, error };
}

export async function cancelContract(contractId: string, reason: string) {
  const { error } = await supabase.rpc("cancel_contract", {
    p_contract_id: contractId,
    p_reason: reason,
  });
  return { error };
}

export async function createReview(contractId: string, rating: number, text: string) {
  const { error } = await supabase.rpc("create_review", {
    p_contract_id: contractId,
    p_rating: rating,
    p_text: text,
  });
  return { error };
}

export async function getContractReviews(contractId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("contract_id", contractId);
  return { data: data || [], error };
}
