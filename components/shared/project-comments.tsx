"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Gavel, Star, ShieldCheck, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import {
  getProjectComments,
  subscribeToProjectComments,
} from "@/lib/services/comments";
import { ProjectComment, Profile } from "@/types/marketplace";
import { cn, timeAgo } from "@/lib/utils";

/**
 * The public thread on a project.
 *
 * Every entry is a note a freelancer wrote when bidding, knowing it would
 * be read by the client AND by whoever else is bidding. Their price and
 * their proposal to the client stay private — see migration 017.
 *
 * Deliberately readable without a session: someone deciding whether to
 * sign up should be able to see how much competition a project already
 * has, since that is the single most useful thing about it.
 */
export function ProjectComments({
  projectId,
  viewer,
  bidHref,
  className,
}: {
  projectId: string;
  /** Null when nobody is signed in. */
  viewer: Profile | null;
  /** Where the bid button goes; omitted hides it. */
  bidHref?: string;
  className?: string;
}) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancellable: a realtime event can land while the first fetch is still
  // in flight, and without this the slower response wins and the thread
  // silently loses whatever arrived in between.
  useEffect(() => {
    let cancelled = false;

    const fetchThread = () => {
      getProjectComments(projectId).then(({ data }) => {
        if (cancelled) return;
        setComments(data);
        setLoading(false);
      });
    };

    fetchThread();
    const unsubscribe = subscribeToProjectComments(projectId, fetchThread);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [projectId]);

  const live = comments.filter((c) => !c.is_withdrawn);

  return (
    <section className={cn("", className)}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Who&apos;s bidding
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {live.length === 0
              ? "No one has bid yet — the first note here will be the first bid."
              : `${live.length} freelancer${live.length === 1 ? " has" : "s have"} introduced themselves publicly.`}
          </p>
        </div>

        {bidHref && (
          <Button
            asChild
            className="rounded-full bg-ink text-paper hover:bg-ink-soft"
          >
            <Link href={bidHref}>
              <Gavel className="mr-2 h-4 w-4" />
              {viewer ? "Place a bid" : "Sign in to bid"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-white"
            />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-border" />
          <p className="font-medium">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            When freelancers bid, the note they write for this project appears
            here so everyone can see who else is interested.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const a = c.author;
            const rating = Number(a?.avg_rating || 0);
            const reviews = a?.total_reviews || 0;
            return (
              <li
                key={c.id}
                className={cn(
                  "rounded-xl border border-border bg-white p-5 transition-opacity",
                  c.is_withdrawn && "opacity-55"
                )}
              >
                <div className="flex items-start gap-3.5">
                  <UserAvatar
                    name={a?.full_name || "Freelancer"}
                    src={a?.avatar_url}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {a?.id ? (
                        <Link
                          href={`/u/${a.id}`}
                          className="font-semibold transition-colors hover:text-brand"
                        >
                          {a.full_name || "Freelancer"}
                        </Link>
                      ) : (
                        <span className="font-semibold">Freelancer</span>
                      )}
                      {a?.is_verified && (
                        <ShieldCheck
                          className="h-4 w-4 text-emerald-600"
                          aria-label="Verified"
                        />
                      )}
                      {reviews > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {rating.toFixed(1)} ({reviews})
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        · {timeAgo(c.created_at)}
                      </span>
                      {c.is_withdrawn && (
                        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Withdrawn
                        </span>
                      )}
                    </div>

                    {a?.headline && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {a.headline}
                      </p>
                    )}

                    <p className="mt-2.5 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">
                      {c.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {live.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Bid amounts and the proposals sent to the client stay private. Only
          these notes are public.
        </p>
      )}
    </section>
  );
}
