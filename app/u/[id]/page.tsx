"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Star,
  ExternalLink,
  MessageSquare,
  Flag,
  Globe,
  Clock,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, inputClass, textareaClass } from "@/components/shared/dashboard-ui";
import {
  UserAvatar,
  NameWithBadge,
  RatingStars,
  SkillTags,
} from "@/components/shared/marketplace-ui";
import {
  getPublicProfile,
  getReviewsFor,
  getPortfolio,
  reportUser,
} from "@/lib/services/profiles";
import { getMyProfile } from "@/lib/services/auth";
import { getOrCreateConversation } from "@/lib/services/messaging";
import { PortfolioItem, Profile, Review } from "@/types/marketplace";
import { formatPrice, formatDate, cn, displayName, partyName } from "@/lib/utils";
import { AVAILABILITY_OPTIONS } from "@/lib/constants";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewer, setViewer] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getPublicProfile(id),
      getReviewsFor(id),
      getPortfolio(id),
      getMyProfile(),
    ]).then(([p, r, pf, me]) => {
      setProfile(p.data);
      setReviews(r.data);
      setPortfolio(pf.data);
      setViewer(me.data);
      setLoading(false);
    });
  }, [id]);

  const message = async () => {
    if (!viewer) {
      toast.error("Log in to send a message");
      return;
    }
    const { data } = await getOrCreateConversation(viewer.id, id, null);
    if (data) router.push(`/messages?c=${data.id}`);
  };

  const submitReport = async () => {
    if (!viewer || !reportReason.trim()) return;
    const { error } = await reportUser(viewer.id, id, reportReason.trim(), reportDetails.trim());
    if (error) return toast.error(error.message || "Could not submit report");
    toast.success("Report submitted — our team will review it");
    setReportOpen(false);
    setReportReason("");
    setReportDetails("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center pt-24">
          <div className="text-center">
            <p className="font-display mb-3 text-3xl font-semibold">Profile not found</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/projects">Browse projects</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isFreelancer = profile.role === "freelancer";
  const isSelf = viewer?.id === profile.id;
  const availability = AVAILABILITY_OPTIONS.find((a) => a.value === profile.availability);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 pb-24 pt-24">
        <div className="container mx-auto px-4 md:px-6">
          <button
            onClick={() => router.back()}
            className="mb-6 mt-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
            {/* Main */}
            <div className="min-w-0">
              <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
                <UserAvatar
                  name={displayName(profile)}
                  src={profile.avatar_url}
                  size={96}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                      <NameWithBadge
                        name={displayName(profile)}
                        verified={profile.is_verified}
                      />
                    </h1>
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] capitalize">
                      {profile.role}
                    </span>
                  </div>

                  {profile.headline && (
                    <p className="mb-3 text-lg text-muted-foreground">{profile.headline}</p>
                  )}
                  {!isFreelancer && profile.company_name && (
                    <p className="mb-3 text-lg text-muted-foreground">{profile.company_name}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {profile.location}
                      </span>
                    )}
                    <RatingStars
                      rating={profile.avg_rating || 0}
                      count={profile.total_reviews || 0}
                    />
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Member since{" "}
                      {new Date(profile.created_at).getFullYear()}
                    </span>
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                        className="link-editorial flex items-center gap-1"
                      >
                        <Globe className="h-3.5 w-3.5" /> Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {profile.bio && (
                <section className="mb-8">
                  <h2 className="eyebrow mb-3">About</h2>
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/85">
                    {profile.bio}
                  </p>
                </section>
              )}

              {isFreelancer && profile.skills.length > 0 && (
                <section className="mb-8">
                  <h2 className="eyebrow mb-3">Skills</h2>
                  <SkillTags skills={profile.skills} max={40} />
                </section>
              )}

              {isFreelancer && portfolio.length > 0 && (
                <section className="mb-8">
                  <h2 className="eyebrow mb-4">Portfolio</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {portfolio.map((item) => (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-xl border border-border bg-white"
                      >
                        {item.image_url && (
                          <div className="aspect-[4/3] overflow-hidden bg-secondary">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-5">
                          <h3 className="mb-1.5 font-semibold">{item.title}</h3>
                          {item.description && (
                            <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                          {item.skills.length > 0 && <SkillTags skills={item.skills} max={3} />}
                          {item.link_url && (
                            <a
                              href={item.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="link-editorial mt-3 inline-flex items-center gap-1 text-sm"
                            >
                              View live <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews */}
              <section>
                <h2 className="eyebrow mb-4">
                  Reviews ({profile.total_reviews || 0})
                </h2>
                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <article key={r.id} className="rounded-xl border border-border bg-white p-5">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={displayName(r.reviewer)}
                              src={r.reviewer?.avatar_url}
                              size={32}
                            />
                            <div>
                              <p className="text-sm font-semibold">
                                {partyName(r.reviewer)}
                              </p>
                              <p className="text-xs capitalize text-muted-foreground">
                                {r.reviewer?.role} · {formatDate(r.created_at)}
                              </p>
                            </div>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            {r.rating.toFixed(1)}
                          </span>
                        </div>
                        {r.review_text && (
                          <p className="break-words text-[15px] leading-relaxed text-foreground/85">
                            “{r.review_text}”
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
                    No reviews yet — reviews appear here once a contract with this{" "}
                    {isFreelancer ? "freelancer" : "client"} is completed.
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-xl border border-border bg-white p-6">
                <h2 className="eyebrow mb-4">
                  {isFreelancer ? "Freelancer stats" : "Client stats"}
                </h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Rating</dt>
                    <dd>
                      <RatingStars
                        rating={profile.avg_rating || 0}
                        count={profile.total_reviews || 0}
                      />
                    </dd>
                  </div>
                  {isFreelancer ? (
                    <>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Total earned</dt>
                        <dd className="font-display text-base font-semibold">
                          {formatPrice(profile.total_earned || 0)}
                        </dd>
                      </div>
                      {profile.hourly_rate ? (
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Hourly rate</dt>
                          <dd className="font-medium">{formatPrice(profile.hourly_rate)}/hr</dd>
                        </div>
                      ) : null}
                      {profile.experience_years > 0 && (
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Experience</dt>
                          <dd className="font-medium">{profile.experience_years} years</dd>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Availability</dt>
                        <dd
                          className={cn(
                            "font-medium",
                            profile.availability === "available" && "text-emerald-700"
                          )}
                        >
                          {availability?.label}
                        </dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Total spent</dt>
                      <dd className="font-display text-base font-semibold">
                        {formatPrice(profile.total_spent || 0)}
                      </dd>
                    </div>
                  )}
                </dl>

                {viewer && !isSelf && (
                  <Button
                    variant="outline"
                    className="mt-5 w-full rounded-full"
                    onClick={message}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" /> Send message
                  </Button>
                )}
                {isSelf && (
                  <Button asChild variant="outline" className="mt-5 w-full rounded-full">
                    <Link href="/settings/profile">Edit my profile</Link>
                  </Button>
                )}
              </div>

              {profile.is_verified ? (
                <div className="rounded-xl border border-border bg-brand-soft p-5 text-sm leading-relaxed text-foreground/80">
                  <p className="mb-1 font-semibold text-foreground">Verified account</p>
                  Identity confirmed by the platform. Reviews come only from
                  completed, paid contracts.
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-white p-5 text-sm leading-relaxed text-muted-foreground">
                  <p className="mb-1 font-semibold text-foreground">Not yet verified</p>
                  This account hasn&apos;t completed identity verification. Reviews
                  still come only from completed, paid contracts.
                </div>
              )}

              {viewer && !isSelf && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-red-200 hover:text-red-600"
                >
                  <Flag className="h-3.5 w-3.5" /> Report this user
                </button>
              )}
            </aside>
          </div>
        </div>
      </main>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Report this user</DialogTitle>
            <DialogDescription>
              Reports go to our moderation team. Misuse of reporting can affect
              your own account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Reason" required>
              <input
                className={inputClass}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="e.g. Requesting payment outside the platform"
              />
            </Field>
            <Field label="Details">
              <textarea
                className={textareaClass}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              disabled={!reportReason.trim()}
              onClick={submitReport}
            >
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
