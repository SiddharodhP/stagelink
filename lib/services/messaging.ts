import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Conversation, Message } from "@/types/marketplace";

const supabase = createBrowserClient();

export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `*,
       p1:participant_1(id, full_name, avatar_url, role, company_name),
       p2:participant_2(id, full_name, avatar_url, role, company_name),
       project:project_id(title),
       messages(id, body, sender_id, is_read, created_at)`
    )
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error || !data) return { data: [] as Conversation[], error };

  const conversations: Conversation[] = data.map((c: any) => {
    const msgs = (c.messages || []).sort(
      (a: Message, b: Message) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return {
      ...c,
      other: c.participant_1 === userId ? c.p2 : c.p1,
      last_message: msgs[0],
    };
  });
  // Most recent activity first
  conversations.sort((a, b) => {
    const ta = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
    const tb = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
    return tb - ta;
  });
  return { data: conversations, error: null };
}

export async function getOrCreateConversation(
  userId: string,
  otherId: string,
  projectId: string | null
) {
  // check both participant orders, then match the project scope in JS
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${otherId}),and(participant_1.eq.${otherId},participant_2.eq.${userId})`
    )
    .limit(20);

  const match = (existing || []).find((c: any) =>
    projectId ? c.project_id === projectId : c.project_id === null
  );
  if (match) return { data: match as Conversation, error: null };

  const { data, error } = await supabase
    .from("conversations")
    .insert({ participant_1: userId, participant_2: otherId, project_id: projectId })
    .select()
    .single();
  return { data: data as Conversation | null, error };
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return { data: (data || []) as Message[], error };
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select()
    .single();
  return { data: data as Message | null, error };
}

export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false);
}

export function subscribeToMessages(
  conversationId: string,
  onNew: (m: Message) => void
) {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNew(payload.new as Message)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
