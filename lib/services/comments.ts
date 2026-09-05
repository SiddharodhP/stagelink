import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { ProjectComment } from "@/types/marketplace";

const supabase = createBrowserClient();

/**
 * The public thread on a project.
 *
 * Readable without a session — that is the point. A visitor weighing up
 * whether to sign up should be able to see how much competition a project
 * already has.
 */
export async function getProjectComments(projectId: string) {
  const { data, error } = await supabase
    .from("project_comments")
    .select(
      `*, author:author_id(id, full_name, avatar_url, headline, is_verified, avg_rating, total_reviews)`
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return { data: (data || []) as ProjectComment[], error };
}

/** Live updates, so a thread being read doesn't go stale as bids land. */
export function subscribeToProjectComments(
  projectId: string,
  onChange: () => void
) {
  const channel = supabase
    .channel(`project-comments-${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_comments",
        filter: `project_id=eq.${projectId}`,
      },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
