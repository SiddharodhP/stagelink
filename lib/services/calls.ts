import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { CallSession } from "@/types/marketplace";

const supabase = createBrowserClient();

/** Rings the other participant. Returns the live session if one exists. */
export async function startCall(conversationId: string) {
  const { data, error } = await supabase.rpc("start_call", {
    p_conversation_id: conversationId,
  });
  return { callId: (data as string | null) ?? null, error };
}

export async function answerCall(callId: string) {
  const { error } = await supabase.rpc("answer_call", { p_call_id: callId });
  return { error };
}

/** Ends, declines or marks missed — the server decides which from the state. */
export async function endCall(callId: string) {
  const { error } = await supabase.rpc("end_call", { p_call_id: callId });
  return { error };
}

/**
 * Heartbeat while in a call.
 *
 * Without this a closed tab leaves the session 'active' forever, which
 * wedges the conversation: start_call finds a "live" call and hands it
 * back instead of starting a new one. See migration 015.
 */
export async function touchCall(callId: string) {
  const { error } = await supabase.rpc("touch_call", { p_call_id: callId });
  return { error };
}

export async function getActiveCall(conversationId: string) {
  const { data, error } = await supabase.rpc("get_active_call", {
    p_conversation_id: conversationId,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row as CallSession) || null, error };
}

/**
 * The JaaS token for a call.
 *
 * Minted server-side from the call id alone — the room, display name and
 * moderator flag are all read from the database, never sent from here.
 */
export async function getCallToken(callId: string) {
  try {
    const res = await fetch(`/api/calls/${callId}/token`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      return { data: null, error: new Error(data.error || "Could not join") };
    }
    return {
      data: data as { token: string; appId: string; room: string },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Live call state for a conversation.
 *
 * This is what makes the phone ring: without it the callee would have to
 * refresh to discover they're being called.
 */
export function subscribeToCalls(
  conversationId: string,
  onChange: (call: CallSession) => void
) {
  const channel = supabase
    .channel(`calls-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "call_sessions",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = (payload.new || payload.old) as CallSession;
        if (row) onChange(row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
