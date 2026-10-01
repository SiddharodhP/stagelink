"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Profile } from "@/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * Mirrors compute_profile_completeness() in migration 011, so the checklist
 * a user sees matches the score the database actually stored. If the
 * weights change there, change them here too.
 */
function missingItems(profile: Profile): string[] {
  const missing: string[] = [];
  if (profile.role === "client") {
    if (!profile.full_name) missing.push("your name");
    if (!profile.company_name) missing.push("company name");
    if (!profile.avatar_url) missing.push("a photo or logo");
    if (!profile.city) missing.push("your city");
    if ((profile.bio || "").length < 60) missing.push("a short intro");
    return missing;
  }
  if (!profile.avatar_url) missing.push("a profile photo");
  if (!profile.headline) missing.push("a headline");
  if ((profile.bio || "").length < 80) missing.push("an about section");
  if (!profile.city) missing.push("your city");
  if ((profile.skills || []).length < 3) missing.push("at least 3 skills");
  if (!profile.hourly_rate) missing.push("your rate");
  return missing;
}

/**
 * Nudges people to finish their profile.
 *
 * Two readings of the same number:
 *
 * - `nudge` (dashboards) hides itself at 100% and links away to the editor.
 *   A permanent green banner on a page you visit daily is noise, and the
 *   directory ranks by completeness, so the incentive is real.
 * - `status` (the profile editor itself) always shows, and links nowhere.
 *   You are already where the link would send you, and having just filled
 *   the form you want the confirmation that you are done.
 */
export function CompletenessMeter({
  profile,
  variant = "nudge",
  className,
}: {
  profile: Profile;
  variant?: "nudge" | "status";
  className?: string;
}) {
  const pct = profile.completeness ?? 0;
  const isStatus = variant === "status";
  if (pct >= 100 && !isStatus) return null;

  const missing = missingItems(profile);
  const tone =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-brand";

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="font-semibold">Your profile is {pct}% complete</p>
        {!isStatus && (
          <Link
            href="/settings/profile"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Finish it <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>

      {missing.length > 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {profile.role === "freelancer"
            ? "Complete profiles rank higher in the directory. Still missing: "
            : "Freelancers bid more confidently on complete profiles. Still missing: "}
          <span className="text-foreground/80">{missing.slice(0, 3).join(", ")}</span>
          {missing.length > 3 ? ` and ${missing.length - 3} more` : ""}.
        </p>
      ) : (
        isStatus && (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing left to fill in.{" "}
            {profile.role === "freelancer"
              ? "Complete profiles rank higher in the directory."
              : "Freelancers bid more confidently on complete profiles."}
          </p>
        )
      )}
    </div>
  );
}
