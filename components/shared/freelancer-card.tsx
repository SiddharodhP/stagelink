"use client";

import Link from "next/link";
import { MapPin, Globe, Star } from "lucide-react";

import { UserAvatar, NameWithBadge, SkillTags } from "@/components/shared/marketplace-ui";
import { Profile } from "@/types/marketplace";
import { formatPrice, cn } from "@/lib/utils";

const AVAILABILITY_TONE: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-800 border-emerald-200",
  limited: "bg-amber-50 text-amber-800 border-amber-200",
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
      className="group flex h-full flex-col rounded-xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-start gap-3.5">
        <UserAvatar
          name={profile.full_name || "Freelancer"}
          src={profile.avatar_url}
          size={52}
        />
        <div className="min-w-0 flex-1">
          <NameWithBadge
            name={profile.full_name || "Freelancer"}
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
