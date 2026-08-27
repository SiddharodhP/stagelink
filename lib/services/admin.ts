import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Dispute, Profile } from "@/types/marketplace";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/services/profiles";

const supabase = createBrowserClient();

export async function getPlatformStats() {
  const [users, projects, contracts, volume, disputes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }).neq("status", "draft"),
    supabase.from("contracts").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("amount, type").eq("type", "release").eq("status", "completed"),
    supabase.from("disputes").select("id", { count: "exact", head: true }).neq("status", "resolved"),
  ]);
  return {
    users: users.count || 0,
    projects: projects.count || 0,
    contracts: contracts.count || 0,
    volumeReleased: (volume.data || []).reduce((s: number, t: any) => s + t.amount, 0),
    openDisputes: disputes.count || 0,
  };
}

export async function getAllUsers() {
  // Admins have no column-level access to the billing block either — the
  // revoke in migration 011 applies to the `authenticated` role, not to a
  // person's admin flag. Moderation never needed those fields anyway.
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  return { data: (data || []) as Profile[], error };
}

export async function setUserFlags(
  id: string,
  flags: Partial<Pick<Profile, "is_verified" | "is_suspended">>
) {
  const { error } = await supabase.from("profiles").update(flags).eq("id", id);
  return { error };
}

export async function getDisputes() {
  const { data, error } = await supabase
    .from("disputes")
    .select(
      `*,
       milestone:milestone_id(title, amount),
       raiser:raised_by(id, full_name, role),
       contract:contract_id(id, client_id, freelancer_id,
         project:project_id(title),
         client:client_id(full_name),
         freelancer:freelancer_id(full_name))`
    )
    .order("created_at", { ascending: false });
  return { data: (data || []) as Dispute[], error };
}

export async function markDisputeUnderReview(id: string) {
  const { error } = await supabase
    .from("disputes")
    .update({ status: "under_review" })
    .eq("id", id);
  return { error };
}

export async function resolveDispute(id: string, outcome: "release" | "refund", note: string) {
  const { error } = await supabase.rpc("resolve_dispute", {
    p_dispute_id: id,
    p_outcome: outcome,
    p_note: note,
  });
  return { error };
}

export async function getReports() {
  const { data, error } = await supabase
    .from("reports")
    .select("*, reporter:reporter_id(full_name), reported:reported_user_id(id, full_name, role, is_suspended)")
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function closeReport(id: string) {
  const { error } = await supabase.from("reports").update({ status: "reviewed" }).eq("id", id);
  return { error };
}
