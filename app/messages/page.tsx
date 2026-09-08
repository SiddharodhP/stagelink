"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Send,
  MessageSquare,
  Loader2,
  ArrowLeft,
  Video,
  PhoneOff,
  Phone,
} from "lucide-react";

import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
} from "@/lib/services/messaging";
import { Button } from "@/components/ui/button";
import { VideoCall } from "@/components/shared/video-call";
import {
  startCall,
  answerCall,
  endCall,
  getActiveCall,
  subscribeToCalls,
} from "@/lib/services/calls";
import { CallSession, Conversation, Message, Profile } from "@/types/marketplace";
import { cn, timeAgo } from "@/lib/utils";

function MessagesInner({ profile }: { profile: Profile }) {
  const params = useSearchParams();
  const initialId = params.get("c");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [call, setCall] = useState<CallSession | null>(null);
  const [inCall, setInCall] = useState(false);
  const [callBusy, setCallBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversations(profile.id).then(({ data }) => {
      setConversations(data);
      const target = initialId ? data.find((c) => c.id === initialId) : data[0];
      if (target) {
        setActive(target);
        if (initialId) setMobileShowThread(true);
      }
      setLoading(false);
    });
  }, [profile.id, initialId]);

  useEffect(() => {
    if (!active) return;
    getMessages(active.id).then(({ data }) => setMessages(data));
    markConversationRead(active.id, profile.id);

    const unsubscribe = subscribeToMessages(active.id, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.sender_id !== profile.id) markConversationRead(active.id, profile.id);
    });
    return unsubscribe;
  }, [active, profile.id]);

  // Call state for the open thread. The realtime subscription is what
  // makes the callee's phone ring — without it they'd have to refresh to
  // notice they were being called.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    getActiveCall(active.id).then(({ data }) => {
      if (!cancelled) setCall(data);
    });

    const unsubscribe = subscribeToCalls(active.id, (row) => {
      if (cancelled) return;
      const live = row.status === "ringing" || row.status === "active";
      setCall(live ? row : null);
      // Whoever hung up first, the other side leaves the meeting too.
      if (!live) setInCall(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      // Runs when the open conversation changes too, so switching threads
      // can't carry one thread's call state into another.
      setCall(null);
      setInCall(false);
    };
  }, [active]);

  // Realtime is the fast path, not the only path. A dropped socket or a
  // missed event used to leave the other person staring at "Connecting…"
  // long after the call had ended, so poll while anything is live.
  useEffect(() => {
    if (!active || !call) return;
    const interval = setInterval(async () => {
      const { data } = await getActiveCall(active.id);
      if (!data) {
        setCall(null);
        setInCall(false);
      } else {
        setCall(data);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [active, call]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const beginCall = async () => {
    if (!active) return;
    setCallBusy(true);
    const { callId, error } = await startCall(active.id);
    setCallBusy(false);
    if (error || !callId) return;
    const { data } = await getActiveCall(active.id);
    setCall(data);
    setInCall(true);
  };

  const acceptCall = async () => {
    if (!call) return;
    setCallBusy(true);
    const { error } = await answerCall(call.id);
    setCallBusy(false);
    if (error) return;
    setInCall(true);
  };

  const hangUp = async () => {
    const id = call?.id;
    setInCall(false);
    setCall(null);
    if (!id) return;
    setCallBusy(true);
    // Read the id before clearing state: if a realtime event cleared `call`
    // first, the old guard returned early and end_call never ran, which is
    // how a session ends up stranded as 'active'.
    await endCall(id);
    setCallBusy(false);
    // end_call writes a "call ended" line into the thread; pick it up.
    if (active) getMessages(active.id).then(({ data }) => setMessages(data));
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !active) return;
    setDraft("");
    const { data } = await sendMessage(active.id, profile.id, body);
    if (data) {
      setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
    }
  };

  const filtered = conversations.filter((c) =>
    search
      ? (c.other?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.project?.title || "").toLowerCase().includes(search.toLowerCase())
      : true
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-6xl flex-col gap-5 md:flex-row">
      {/* List */}
      <div
        className={cn(
          "flex w-full shrink-0 flex-col rounded-xl border border-border bg-white md:h-full md:w-80",
          mobileShowThread ? "hidden md:flex" : "flex h-full"
        )}
      >
        <div className="border-b border-border p-4">
          <h2 className="font-display mb-3 text-xl font-semibold">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-border" />
              <p className="text-sm text-muted-foreground">
                No conversations yet. Message a client from a project page, or a
                freelancer from their bid.
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = active?.id === c.id;
              const unread =
                c.last_message && !c.last_message.is_read && c.last_message.sender_id !== profile.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActive(c);
                    setMobileShowThread(true);
                  }}
                  className={cn(
                    "flex w-full gap-3 rounded-lg p-3 text-left transition-colors",
                    isActive ? "bg-ink text-paper" : "hover:bg-secondary"
                  )}
                >
                  <UserAvatar
                    name={c.other?.full_name || "User"}
                    src={c.other?.avatar_url}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {c.other?.company_name || c.other?.full_name || "User"}
                      </span>
                      {c.last_message && (
                        <span
                          className={cn(
                            "shrink-0 text-[10px]",
                            isActive ? "text-paper/60" : "text-muted-foreground"
                          )}
                        >
                          {timeAgo(c.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {c.project?.title && (
                      <p
                        className={cn(
                          "truncate text-[11px]",
                          isActive ? "text-paper/60" : "text-brand"
                        )}
                      >
                        {c.project.title}
                      </p>
                    )}
                    {c.last_message && (
                      <p
                        className={cn(
                          "truncate text-xs",
                          isActive
                            ? "text-paper/70"
                            : unread
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                        )}
                      >
                        {c.last_message.sender_id === profile.id && "You: "}
                        {c.last_message.body}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread */}
      <div
        className={cn(
          "flex flex-1 flex-col rounded-xl border border-border bg-white",
          mobileShowThread ? "h-full" : "hidden md:flex"
        )}
      >
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-border p-4">
              <button
                className="md:hidden"
                onClick={() => setMobileShowThread(false)}
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Link
                href={`/u/${active.other?.id}`}
                className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
              >
                <UserAvatar
                  name={active.other?.full_name || "User"}
                  src={active.other?.avatar_url}
                  size={40}
                />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">
                    {active.other?.company_name || active.other?.full_name}
                  </h3>
                  <p className="truncate text-xs capitalize text-muted-foreground">
                    {active.other?.role}
                    {active.project?.title && ` · ${active.project.title}`}
                  </p>
                </div>
              </Link>

              <Button
                variant="outline"
                size="sm"
                className="ml-auto shrink-0 rounded-full"
                disabled={callBusy || inCall}
                onClick={beginCall}
                aria-label={`Start a video call with ${
                  active.other?.full_name || "this person"
                }`}
              >
                {callBusy && !call ? (
                  <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                ) : (
                  <Video className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Call</span>
              </Button>
            </div>

            {/* Incoming call. Only the person being rung sees this. */}
            {call &&
              call.status === "ringing" &&
              call.callee_id === profile.id &&
              !inCall && (
                <div className="flex flex-wrap items-center gap-3 border-b border-border bg-emerald-50 px-4 py-3">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  </span>
                  <p className="text-sm font-medium">
                    {active.other?.full_name || "Someone"} is calling
                  </p>
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={callBusy}
                      onClick={acceptCall}
                    >
                      <Phone className="mr-1.5 h-3.5 w-3.5" /> Answer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={callBusy}
                      onClick={hangUp}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              )}

            {/* Caller's side while it rings out. */}
            {call &&
              call.status === "ringing" &&
              call.caller_id === profile.id &&
              !inCall && (
                <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Ringing {active.other?.full_name || "them"}…
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto rounded-full"
                    disabled={callBusy}
                    onClick={hangUp}
                  >
                    <PhoneOff className="mr-1.5 h-3.5 w-3.5" /> Cancel
                  </Button>
                </div>
              )}

            {/* The meeting itself, in place of the message list. */}
            {inCall && call ? (
              <div className="flex-1 overflow-y-auto bg-background/60 p-4">
                <VideoCall callId={call.id} onLeave={hangUp} />
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="outline"
                    className="rounded-full text-rose-700 hover:text-rose-800"
                    onClick={hangUp}
                  >
                    <PhoneOff className="mr-2 h-4 w-4" /> Leave call
                  </Button>
                </div>
              </div>
            ) : (
            <div className="flex-1 space-y-3 overflow-y-auto bg-background/60 p-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="mb-4 h-12 w-12 opacity-20" />
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === profile.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          mine
                            ? "rounded-br-sm bg-ink text-paper"
                            : "rounded-bl-sm border border-border bg-white"
                        )}
                      >
                        {m.body}
                        <span
                          className={cn(
                            "mt-1 block text-[10px]",
                            mine ? "text-paper/50" : "text-muted-foreground"
                          )}
                        >
                          {timeAgo(m.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>
            )}

            <div className="border-t border-border p-4">
              <div className="relative flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Type your message…"
                  className="h-12 w-full rounded-full border border-border bg-white pl-5 pr-14 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={send}
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper transition-colors hover:bg-ink-soft disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="mb-4 h-14 w-14 opacity-20" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <WorkspaceShellFree>
      {(profile) => (
        <Suspense
          fallback={
            <div className="flex h-[60vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          }
        >
          <MessagesInner profile={profile} />
        </Suspense>
      )}
    </WorkspaceShellFree>
  );
}
