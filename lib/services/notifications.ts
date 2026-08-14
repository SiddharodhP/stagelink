import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { AppNotification } from "@/types/marketplace";

const supabase = createBrowserClient();

export async function getNotifications(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data || []) as AppNotification[], error };
}

export async function getUnreadCount(userId: string) {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count || 0;
}

export async function markRead(id: string) {
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}

/** Realtime: invoke callback whenever a new notification lands for this user. */
export function subscribeToNotifications(
  userId: string,
  onNew: (n: AppNotification) => void
) {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNew(payload.new as AppNotification)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
