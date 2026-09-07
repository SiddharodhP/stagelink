"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Star,
  Check,
  ArrowUpDown,
  Users,
  Clock,
  MessageSquare,
  Award,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyCard, SkeletonRows } from "@/components/shared/dashboard-ui";
import {
  BidStatusPill,
  NameWithBadge,
  RatingStars,
  SkillTags,
  UserAvatar,
} from "@/components/shared/marketplace-ui";
import { getProjectBids, acceptBid, updateBid } from "@/lib/services/bids";
import { getOrCreateConversation } from "@/lib/services/messaging";
import { getMyProfile } from "@/lib/services/auth";
import { Bid, Project } from "@/types/marketplace";
import { formatPrice, timeAgo, cn } from "@/lib/utils";

type SortKey = "recommended" | "price_asc" | "price_desc" | "rating" | "fastest";

/**
 * Client-side bid evaluation. Deliberately surfaces reputation, delivery time
 * and proposal quality alongside price so the decision isn't reduced to cost.
 */
export function BidComparison({
  project,
  onAwarded,
}: {
  project: Project;
  onAwarded: () => void;
}) {
  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [awardTarget, setAwardTarget] = useState<Bid | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);

  const load = () => {
    getProjectBids(project.id).then(({ data }) => {
      setBids(data);
      setLoading(false);
    });
  };

  useEffect(load, [project.id]);

  const sorted = [...bids].sort((a, b) => {
    const ar = a.freelancer?.avg_rating || 0;
    const br = b.freelancer?.avg_rating || 0;
    switch (sort) {
      case "price_asc": return a.amount - b.amount;
      case "price_desc": return b.amount - a.amount;
      case "rating": return br - ar || (b.freelancer?.total_reviews || 0) - (a.freelancer?.total_reviews || 0);
      case "fastest": return a.delivery_days - b.delivery_days;
      default: {
        // Blend reputation, proposal effort and price competitiveness.
        const score = (x: Bid) => {
          const rating = x.freelancer?.avg_rating || 0;
          const reviews = x.freelancer?.total_reviews || 0;
          const effort = Math.min(x.proposal.length / 400, 1);
          const priceRank = 1 - x.amount / Math.max(...bids.map((y) => y.amount), 1);
          return rating * 10 + Math.log10(1 + reviews) * 6 + effort * 8 + priceRank * 6 +
            (x.status === "shortlisted" ? 15 : 0);
        };
        return score(b) - score(a);
      }
    }
  });

  const live = sorted.filter((b) => !["withdrawn", "rejected"].includes(b.status));
  const prices = live.map((b) => b.amount);
  const lowest = prices.length ? Math.min(...prices) : 0;
  const highest = prices.length ? Math.max(...prices) : 0;
  const average = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;

  const toggleShortlist = async (bid: Bid) => {
    const next = bid.status === "shortlisted" ? "submitted" : "shortlisted";
    const { error } = await updateBid(bid.id, { status: next as any });
    if (error) return toast.error(error.message || "Could not update");
    setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, status: next as any } : b)));
    toast.success(next === "shortlisted" ? "Added to shortlist" : "Removed from shortlist");
  };

  const award = async () => {
    if (!awardTarget) return;
    setIsAwarding(true);
    const { contractId, error } = await acceptBid(awardTarget.id);
    setIsAwarding(false);
    if (error) {
      toast.error(error.message || "Could not award the project");
      return;
    }
    toast.success("Project awarded — the freelancer will confirm the milestones");
    setAwardTarget(null);
    onAwarded();
    if (contractId) router.push(`/contracts/${contractId}`);
  };

  const messageFreelancer = async (bid: Bid) => {
    const { data: me } = await getMyProfile();
    if (!me) return;
    const { data, error } = await getOrCreateConversation(me.id, bid.freelancer_id, project.id);
    if (error || !data) return toast.error("Could not start the conversation");
    router.push(`/messages?c=${data.id}`);
  };

  if (loading) return <SkeletonRows count={2} height={160} />;

  if (bids.length === 0) {
    return (
      <EmptyCard
        icon={Users}
        title="No bids yet"
        description="Freelancers are still discovering your project. Clear milestones and a specific description bring in stronger bids."
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Bids received ({live.length})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare on more than price — reputation and proposal quality predict outcomes better.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="recommended">Recommended</option>
            <option value="price_asc">Lowest price</option>
            <option value="price_desc">Highest price</option>
            <option value="rating">Highest rated</option>
            <option value="fastest">Fastest delivery</option>
          </select>
        </div>
      </div>

      {/* Price context strip */}
      {live.length > 1 && (
        <dl className="mb-5 grid grid-cols-3 gap-4 rounded-xl border border-border bg-white p-5">
          {[
            ["Lowest bid", lowest],
            ["Average bid", average],
            ["Highest bid", highest],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="eyebrow mb-1">{label}</dt>
              <dd className="font-display text-xl font-semibold">{formatPrice(value as number)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="space-y-4">
        {sorted.map((bid) => {
          const f = bid.freelancer;
          const isLowest = bid.amount === lowest && live.length > 1;
          const dimmed = ["withdrawn", "rejected"].includes(bid.status);

          return (
            <article
              key={bid.id}
              className={cn(
                "rounded-xl border bg-white p-5 md:p-6",
                bid.status === "accepted"
                  ? "border-emerald-300 bg-emerald-50/40"
                  : bid.status === "shortlisted"
                    ? "border-ink/40"
                    : "border-border",
                dimmed && "opacity-55"
              )}
            >
              <div className="flex flex-col gap-5 md:flex-row">
                {/* Freelancer identity */}
                <div className="flex min-w-0 gap-3 md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:pr-6">
                  <div className="flex items-start gap-3">
                    <UserAvatar name={f?.full_name || "Freelancer"} src={f?.avatar_url} size={48} />
                    <div className="min-w-0">
                      <Link
                        href={`/u/${bid.freelancer_id}`}
                        className="font-semibold hover:text-brand"
                      >
                        <NameWithBadge
                          name={f?.full_name || "Freelancer"}
                          verified={f?.is_verified}
                        />
                      </Link>
                      {f?.headline && (
                        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                          {f.headline}
                        </p>
                      )}
                      <div className="mt-1.5">
                        <RatingStars rating={f?.avg_rating || 0} count={f?.total_reviews || 0} />
                      </div>
                    </div>
                  </div>

                  <div className="hidden space-y-1.5 text-xs text-muted-foreground md:block">
                    {f?.location && <p>{f.location}</p>}
                    {(f?.experience_years ?? 0) > 0 && <p>{f?.experience_years} yrs experience</p>}
                    {f?.skills && f.skills.length > 0 && (
                      <div className="pt-1">
                        <SkillTags skills={f.skills} max={3} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Proposal */}
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <BidStatusPill status={bid.status} />
                      {isLowest && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-800">
                          Lowest bid
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{timeAgo(bid.created_at)}</span>
                    </div>

                    <div className="text-right">
                      <p className="font-display text-2xl font-semibold leading-none">
                        {formatPrice(bid.amount)}
                      </p>
                      <p className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {bid.delivery_days} days
                      </p>
                    </div>
                  </div>

                  <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                    {bid.proposal}
                  </p>

                  {!dimmed && bid.status !== "accepted" && project.status === "open" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                        onClick={() => setAwardTarget(bid)}
                      >
                        <Award className="mr-2 h-4 w-4" /> Award project
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => toggleShortlist(bid)}
                      >
                        <Star
                          className={cn(
                            "mr-2 h-4 w-4",
                            bid.status === "shortlisted" && "fill-amber-500 text-amber-500"
                          )}
                        />
                        {bid.status === "shortlisted" ? "Shortlisted" : "Shortlist"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-full text-muted-foreground"
                        onClick={() => messageFreelancer(bid)}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" /> Message
                      </Button>
                    </div>
                  )}

                  {bid.status === "accepted" && (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                      <Check className="h-4 w-4" /> Awarded to this freelancer
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Award confirmation */}
      <Dialog open={Boolean(awardTarget)} onOpenChange={(o) => !o && setAwardTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Award this project?
            </DialogTitle>
            <DialogDescription>
              {awardTarget?.freelancer?.full_name} will be asked to confirm your
              milestone structure before work begins. All other bids will be
              declined.
            </DialogDescription>
          </DialogHeader>

          {awardTarget && (
            <dl className="space-y-2 rounded-lg bg-secondary p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Agreed price</dt>
                <dd className="font-display text-lg font-semibold">
                  {formatPrice(awardTarget.amount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery estimate</dt>
                <dd className="font-medium">{awardTarget.delivery_days} days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Milestones</dt>
                <dd className="font-medium">
                  {(project.milestones?.length ?? 0) > 0
                    ? project.milestones?.length
                    : "Set after award"}
                </dd>
              </div>
            </dl>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setAwardTarget(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              onClick={award}
              disabled={isAwarding}
            >
              {isAwarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm and award
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
