import { createClient as createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();

export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      messages (
        message,
        created_at,
        is_read,
        sender_id
      )
    `)
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function getOrCreateConversation(userId1: string, userId2: string) {
  // Try to find existing conversation
  const { data: existing, error: searchError } = await supabase
    .from("conversations")
    .select("*")
    .or(`and(participant_1.eq.${userId1},participant_2.eq.${userId2}),and(participant_1.eq.${userId2},participant_2.eq.${userId1})`)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Create new conversation
  const { data: newConv, error: createError } = await supabase
    .from("conversations")
    .insert({
      participant_1: userId1,
      participant_2: userId2
    })
    .select()
    .single();

  return { data: newConv, error: createError };
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return { data, error };
}

export async function sendMessage(conversationId: string, senderId: string, message: string) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      message
    })
    .select()
    .single();

  return { data, error };
}

export async function markAsRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false);

  return { error };
}

export function subscribeToMessages(conversationId: string, callback: (payload: any) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
