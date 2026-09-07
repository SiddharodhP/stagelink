import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  Category,
  Milestone,
  Project,
  ProjectFilters,
} from "@/types/marketplace";

const supabase = createBrowserClient();

export const PROJECT_PAGE_SIZE = 10;

const PROJECT_CARD_SELECT = `
  *,
  client:client_id(id, full_name, avatar_url, company_name, location, is_verified),
  category:category_id(id, name, slug)
`;

export async function getCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  return { data: (data || []) as Category[], error };
}

export async function getSkillsList() {
  const { data, error } = await supabase.from("skills").select("name").order("name");
  return { data: (data || []).map((s: any) => s.name as string), error };
}

/* ---------- Discovery ---------- */

export async function searchProjects(filters: Partial<ProjectFilters>) {
  let query = supabase
    .from("projects")
    .select(PROJECT_CARD_SELECT, { count: "exact" })
    .eq("status", "open");

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.skills && filters.skills.length > 0)
    query = query.overlaps("skills", filters.skills);
  if (filters.budgetMin != null) query = query.gte("budget_total", filters.budgetMin);
  if (filters.budgetMax != null) query = query.lte("budget_total", filters.budgetMax);
  if (filters.experienceLevel)
    query = query.eq("experience_level", filters.experienceLevel);
  if (filters.maxBids != null) query = query.lte("bids_count", filters.maxBids);

  switch (filters.sortBy) {
    case "budget_desc": query = query.order("budget_total", { ascending: false }); break;
    case "budget_asc": query = query.order("budget_total", { ascending: true }); break;
    case "deadline": query = query.order("deadline", { ascending: true, nullsFirst: false }); break;
    case "fewest_bids": query = query.order("bids_count", { ascending: true }); break;
    case "newest":
    default: query = query.order("published_at", { ascending: false }); break;
  }

  const page = filters.page || 1;
  const from = (page - 1) * PROJECT_PAGE_SIZE;
  query = query.range(from, from + PROJECT_PAGE_SIZE - 1);

  const { data, error, count } = await query;
  return { data: (data || []) as Project[], count: count || 0, error };
}

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `${PROJECT_CARD_SELECT}, milestones(*), attachments:project_attachments(*)`
    )
    .eq("id", id)
    .maybeSingle();
  if (data?.milestones) {
    data.milestones.sort((a: Milestone, b: Milestone) => a.seq - b.seq);
  }
  return { data: data as Project | null, error };
}

export async function getClientProjects(clientId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(`${PROJECT_CARD_SELECT}, milestones(*)`)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return { data: (data || []) as Project[], error };
}

/* ---------- Authoring ---------- */

export async function createDraftProject(clientId: string, fields: Partial<Project>) {
  const { data, error } = await supabase
    .from("projects")
    .insert({ client_id: clientId, ...fields, status: "draft" })
    .select()
    .single();
  return { data: data as Project | null, error };
}

export async function updateProject(id: string, fields: Partial<Project>) {
  const { data, error } = await supabase
    .from("projects")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Project | null, error };
}

export async function publishProject(id: string) {
  // draft -> open is validated DB-side. Since migration 019 the
  // requirement is a budget, not milestones — those are agreed with the
  // freelancer after the award.
  const { data, error } = await supabase
    .from("projects")
    .update({ status: "open" })
    .eq("id", id)
    .select()
    .single();
  return { data: data as Project | null, error };
}

export async function cancelProject(id: string) {
  const { error } = await supabase
    .from("projects")
    .update({ status: "cancelled" })
    .eq("id", id);
  return { error };
}

export async function deleteDraft(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  return { error };
}

/* ---------- Milestones (structure editing, pre-contract) ---------- */

export async function upsertMilestones(
  projectId: string,
  milestones: Array<Pick<Milestone, "title" | "description" | "deliverables" | "amount" | "due_date"> & { id?: string }>
) {
  // Replace-all strategy keeps seq numbering simple while the project is a draft.
  const { error: delError } = await supabase
    .from("milestones")
    .delete()
    .eq("project_id", projectId);
  if (delError) return { error: delError };

  const rows = milestones.map((m, i) => ({
    project_id: projectId,
    seq: i + 1,
    title: m.title,
    description: m.description || null,
    deliverables: m.deliverables || null,
    amount: m.amount,
    due_date: m.due_date || null,
  }));
  const { error } = await supabase.from("milestones").insert(rows);
  return { error };
}

export async function addAttachment(projectId: string, fileUrl: string, fileName: string) {
  const { error } = await supabase
    .from("project_attachments")
    .insert({ project_id: projectId, file_url: fileUrl, file_name: fileName });
  return { error };
}

/* ---------- Saved projects ---------- */

export async function toggleSavedProject(userId: string, projectId: string, save: boolean) {
  if (save) {
    const { error } = await supabase
      .from("saved_projects")
      .insert({ user_id: userId, project_id: projectId });
    return { error };
  }
  const { error } = await supabase
    .from("saved_projects")
    .delete()
    .eq("user_id", userId)
    .eq("project_id", projectId);
  return { error };
}

export async function getSavedProjectIds(userId: string) {
  const { data } = await supabase
    .from("saved_projects")
    .select("project_id")
    .eq("user_id", userId);
  return new Set((data || []).map((r: any) => r.project_id as string));
}

export async function getSavedProjects(userId: string) {
  const { data, error } = await supabase
    .from("saved_projects")
    .select(`project:project_id(${PROJECT_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return {
    data: (data || []).map((r: any) => r.project).filter(Boolean) as Project[],
    error,
  };
}
