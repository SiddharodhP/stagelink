"use client";

import Link from "next/link";
import { MapPin, Globe, Star, Briefcase } from "lucide-react";

import { UserAvatar, NameWithBadge, SkillTags } from "@/components/shared/marketplace-ui";
import { Profile } from "@/types/marketplace";
import { formatPrice, cn, displayName, partyName } from "@/lib/utils";

const AVAILABILITY_TONE: Record<string, string> = {
  available: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  limited: "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  unavailable: "bg-secondary text-foreground/60 border-border",
};

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Available",
  limited: "Limited",
  unavailable: "Booked up",
};

/**
 * Directory card.
 *
 * Deliberately leads with the avatar and headline rather than the rate:
 * photo and video hiring is a visual, trust-first decision, and leading on
 * price invites a race to the bottom that drives good freelancers off the
 * platform.
 */
export function FreelancerCard({ profile }: { profile: Profile }) {
  const rating = Number(profile.avg_rating || 0);
  const reviews = profile.total_reviews || 0;
  const place = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <Link
      href={`/u/${profile.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-freelancer hover:shadow-sm"
    >
      {/* Which side of the marketplace this is, read before any word on
          the card. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-freelancer" />

      <div className="flex items-start gap-3.5">
        <UserAvatar
          name={displayName(profile)}
          src={profile.avatar_url}
          size={52}
          className="ring-2 ring-freelancer/35"
        />
        <div className="min-w-0 flex-1">
          <NameWithBadge
            name={displayName(profile)}
            verified={profile.is_verified}
          />
          {profile.headline && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {profile.headline}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        {place && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {place}
          </span>
        )}
        {profile.works_remotely && (
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" /> Remote
          </span>
        )}
        {reviews > 0 ? (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
            <span className="font-normal text-muted-foreground">({reviews})</span>
          </span>
        ) : (
          <span className="italic">No reviews yet</span>
        )}
      </div>

      {profile.skills?.length > 0 && (
        <div className="mt-3.5">
          <SkillTags skills={profile.skills} max={3} />
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
            AVAILABILITY_TONE[profile.availability] || AVAILABILITY_TONE.unavailable
          )}
        >
          {AVAILABILITY_LABEL[profile.availability] || "Unknown"}
        </span>
        {profile.hourly_rate ? (
          <span className="font-display text-base font-semibold">
            {formatPrice(profile.hourly_rate)}
            <span className="text-xs font-normal text-muted-foreground">/hr</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Rate on request</span>
        )}
      </div>
    </Link>
  );
}

/**
 * Client card.
 *
 * Shows the things a freelancer actually weighs before spending an hour on
 * a proposal: is this a real company, have they hired here before, and are
 * they hiring right now. Deliberately not a mirror of the freelancer card
 * — rate, skills and availability mean nothing on this side.
 */
export function ClientCard({
  profile,
  openProjects = 0,
}: {
  profile: Profile;
  openProjects?: number;
}) {
  const rating = Number(profile.avg_rating || 0);
  const reviews = profile.total_reviews || 0;
  const spent = profile.total_spent || 0;
  const place = [profile.city, profile.state].filter(Boolean).join(", ");
  const name = partyName(profile);

  return (
    <Link
      href={`/u/${profile.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-client hover:shadow-sm"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-client" />

      <div className="flex items-start gap-3.5">
        <UserAvatar
          name={name}
          src={profile.avatar_url}
          size={52}
          className="ring-2 ring-client/35"
        />
        <div className="min-w-0 flex-1">
          <NameWithBadge name={name} verified={profile.is_verified} />
          {profile.company_name && profile.full_name && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {profile.full_name}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        {place && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {place}
          </span>
        )}
        {reviews > 0 ? (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
            <span className="font-normal text-muted-foreground">({reviews})</span>
          </span>
        ) : (
          <span className="italic">No reviews yet</span>
        )}
      </div>

      {profile.bio && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {profile.bio}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        {openProjects > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-300">
            <Briefcase className="h-3 w-3" />
            {openProjects} hiring
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
            Not hiring
          </span>
        )}
        {spent > 0 ? (
          <span className="text-right">
            <span className="font-display text-base font-semibold">
              {formatPrice(spent)}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              paid out
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">New client</span>
        )}
      </div>
    </Link>
  );
}
