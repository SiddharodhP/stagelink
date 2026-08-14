"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Send, MessageSquare, Loader2, ArrowLeft } from "lucide-react";

import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
} from "@/lib/services/messaging";
import { Conversation, Message, Profile } from "@/types/marketplace";
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            </div>

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
                          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
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
