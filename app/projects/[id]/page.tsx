"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  Loader2,
  Heart,
  Paperclip,
  ShieldCheck,

  MessageSquare,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { MilestoneList } from "@/components/shared/milestone-list";
import { BidPanel } from "@/components/shared/bid-panel";
import { BidComparison } from "@/components/shared/bid-comparison";
import { ProjectComments } from "@/components/shared/project-comments";
import {
  ProjectStatusPill,
  SkillTags,
  UserAvatar,
  NameWithBadge,
  RatingStars,
} from "@/components/shared/marketplace-ui";
import { getProject, toggleSavedProject, getSavedProjectIds } from "@/lib/services/projects";
import { getMyBidForProject } from "@/lib/services/bids";
import { getMyProfile } from "@/lib/services/auth";
import { getPublicProfile } from "@/lib/services/profiles";
import { getOrCreateConversation } from "@/lib/services/messaging";
import { Bid, Profile, Project } from "@/types/marketplace";
import { formatPrice, formatDate, timeAgo, cn } from "@/lib/utils";
import { EXPERIENCE_LEVELS, LOCATION_PREFS } from "@/lib/constants";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [project, setProject] = useState<Project | null>(null);
  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getProject(id);
    if (!data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProject(data);

    const [{ data: me }, { data: owner }] = await Promise.all([
      getMyProfile(),
      getPublicProfile(data.client_id),
    ]);
    setProfile(me);
    setClientProfile(owner);

    if (me) {
      if (me.role === "freelancer") {
        const [{ data: bid }, savedSet] = await Promise.all([
          getMyBidForProject(id, me.id),
          getSavedProjectIds(me.id),
        ]);
        setMyBid(bid);
        setSaved(savedSet.has(id));
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const messageClient = async () => {
    if (!profile || !project) {
      toast.error("Log in to message this client");
      return;
    }
    const { data, error } = await getOrCreateConversation(
      profile.id,
      project.client_id,
      project.id
    );
    if (error || !data) {
      toast.error("Could not start the conversation");
      return;
    }
    router.push(`/messages?c=${data.id}`);
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

  if (notFound || !project) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center pt-24">
          <div className="text-center">
            <p className="font-display mb-3 text-3xl font-semibold">Project not found</p>
            <p className="mb-6 text-muted-foreground">
              It may have been removed, or it&apos;s still a private draft.
            </p>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/projects">Browse open projects</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isOwner = profile?.id === project.client_id;
  const isFreelancer = profile?.role === "freelancer";
  const exp = EXPERIENCE_LEVELS.find((e) => e.value === project.experience_level);
  const loc = LOCATION_PREFS.find((l) => l.value === project.location_pref);
  const milestones = project.milestones || [];

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

          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            {/* ---------- Main column ---------- */}
            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <ProjectStatusPill status={project.status} />
                {project.category?.name && (
                  <span className="text-sm text-muted-foreground">{project.category.name}</span>
                )}
                {project.published_at && (
                  <span className="text-sm text-muted-foreground">
                    · Posted {timeAgo(project.published_at)}
                  </span>
                )}
              </div>

              <h1 className="font-display mb-5 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                {project.title}
              </h1>

              {/* Key facts strip */}
              <dl className="mb-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-white p-5 sm:grid-cols-4">
                <div>
                  <dt className="eyebrow mb-1">Budget</dt>
                  <dd className="font-display text-xl font-semibold">
                    {formatPrice(project.budget_total)}
                  </dd>
                </div>
                {milestones.length > 0 && (
                  <div>
                    <dt className="eyebrow mb-1">Milestones</dt>
                    <dd className="font-display text-xl font-semibold">
                      {milestones.length}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="eyebrow mb-1">Bids</dt>
                  <dd className="font-display text-xl font-semibold">{project.bids_count}</dd>
                </div>
                <div>
                  <dt className="eyebrow mb-1">Deadline</dt>
                  <dd className="font-medium">
                    {project.deadline ? formatDate(project.deadline) : "Flexible"}
                  </dd>
                </div>
              </dl>

              <section className="mb-8">
                <h2 className="eyebrow mb-3">Project description</h2>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/85">
                  {project.description}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="eyebrow mb-3">Required skills</h2>
                <SkillTags skills={project.skills} max={30} />
              </section>

              <section className="mb-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-5 text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Experience:</span>
                  <strong className="font-medium">{exp?.label}</strong>
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <strong className="font-medium">{loc?.label}</strong>
                </span>
                {project.expected_duration && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Duration:</span>
                    <strong className="font-medium">{project.expected_duration}</strong>
                  </span>
                )}
              </section>

              {project.attachments && project.attachments.length > 0 && (
                <section className="mb-8">
                  <h2 className="eyebrow mb-3">Attachments</h2>
                  <ul className="space-y-2">
                    {project.attachments.map((a) => (
                      <li key={a.id}>
                        <a
                          href={a.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="link-editorial inline-flex items-center gap-2 text-sm"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {a.file_name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Milestones — the core of the product */}
              <section className="mb-8">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="eyebrow">Milestone structure</h2>
                  <span className="text-xs text-muted-foreground">
                    Payment released per approved milestone
                  </span>
                </div>
                {milestones.length > 0 ? (
                  <MilestoneList milestones={milestones} />
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-white p-6 text-sm leading-relaxed text-muted-foreground">
                    Milestones aren&apos;t set yet. Once the client picks a
                    freelancer, the two of them talk the work through and the
                    client breaks it into stages — each funded in escrow and
                    paid on approval. The freelancer confirms that plan before
                    anything starts.
                  </p>
                )}
              </section>

              {/* Public thread. Visible to everyone, signed in or not —
                  a visitor deciding whether to join should be able to see
                  how much competition a project already has. */}
              <ProjectComments
                className="mt-12"
                projectId={project.id}
                viewer={profile}
                bidHref={
                  isOwner
                    ? undefined
                    : profile
                      ? undefined
                      : `/login?next=${encodeURIComponent(`/projects/${project.id}`)}`
                }
              />

              {/* Owner: bid comparison */}
              {isOwner && (
                <section className="mt-12">
                  <BidComparison project={project} onAwarded={load} />
                </section>
              )}
            </div>

            {/* ---------- Sidebar ---------- */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              {isFreelancer && (
                <BidPanel
                  project={project}
                  profile={profile!}
                  existingBid={myBid}
                  onChange={(b) => {
                    setMyBid(b);
                    load();
                  }}
                />
              )}

              {isOwner && (
                <div className="rounded-xl border border-border bg-white p-6">
                  <h2 className="font-display mb-1 text-xl font-semibold">Your project</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {project.bids_count} freelancer{project.bids_count === 1 ? " has" : "s have"} bid
                    so far.
                  </p>
                  <Button
                    asChild
                    className="w-full rounded-full bg-ink text-paper hover:bg-ink-soft"
                  >
                    <Link href="/client/projects">Manage projects</Link>
                  </Button>
                </div>
              )}

              {/* Client card */}
              <div className="rounded-xl border border-border bg-white p-6">
                <h2 className="eyebrow mb-4">About the client</h2>
                <Link
                  href={`/u/${project.client_id}`}
                  className="mb-4 flex items-center gap-3 transition-opacity hover:opacity-80"
                >
                  <UserAvatar
                    name={clientProfile?.full_name || "Client"}
                    src={clientProfile?.avatar_url}
                    size={48}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      <NameWithBadge
                        name={clientProfile?.company_name || clientProfile?.full_name || "Client"}
                        verified={clientProfile?.is_verified}
                      />
                    </p>
                    {clientProfile?.location && (
                      <p className="text-xs text-muted-foreground">{clientProfile.location}</p>
                    )}
                  </div>
                </Link>

                <div className="mb-4 space-y-2.5 border-y border-border py-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rating</span>
                    <RatingStars
                      rating={clientProfile?.avg_rating || 0}
                      count={clientProfile?.total_reviews || 0}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total spent</span>
                    <span className="font-medium">
                      {formatPrice(clientProfile?.total_spent || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="font-medium">
                      {clientProfile ? new Date(clientProfile.created_at).getFullYear() : "—"}
                    </span>
                  </div>
                </div>

                {profile && !isOwner && (
                  <Button variant="outline" className="w-full rounded-full" onClick={messageClient}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Message client
                  </Button>
                )}
              </div>

              {/* Trust */}
              <div className="rounded-xl border border-border bg-brand-soft p-5 text-sm leading-relaxed text-foreground/80">
                <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-brand" />
                  Escrow protected
                </p>
                The client funds each milestone before work starts on it. Payment
                is released to the freelancer when the milestone is approved.
              </div>

              {isFreelancer && (
                <button
                  onClick={async () => {
                    if (!profile) return;
                    const next = !saved;
                    setSaved(next);
                    await toggleSavedProject(profile.id, project.id, next);
                    toast.success(next ? "Saved to your list" : "Removed from saved");
                  }}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition-colors",
                    saved
                      ? "border-brand bg-brand-soft text-brand-deep"
                      : "border-border bg-white hover:border-ink/40"
                  )}
                >
                  <Heart className={cn("h-4 w-4", saved && "fill-brand text-brand")} />
                  {saved ? "Saved" : "Save this project"}
                </button>
              )}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
