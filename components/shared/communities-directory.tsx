"use client";

import { useState } from "react";
import { ExternalLink, Lightbulb } from "lucide-react";
import {
  COMMUNITIES,
  FOCUS_LABEL,
  CommunityFocus,
} from "@/lib/communities";
import { ChipToggle } from "@/components/shared/dashboard-ui";
import { cn } from "@/lib/utils";

const FILTERS: { key: CommunityFocus | "all"; label: string }[] = [
  { key: "photo", label: "Photography" },
  { key: "video", label: "Video & film" },
  { key: "all", label: "All" },
];

const PLATFORM_TONE: Record<string, string> = {
  Reddit: "bg-brand-soft text-brand-deep border-brand/20",
  "Job board": "bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
  Network: "bg-secondary text-foreground/70 border-border",
};

/**
 * Curated directory of places clients post freelance work. Static by
 * design — see lib/communities.ts for why these aren't live feeds.
 */
export function CommunitiesDirectory({
  defaultFocus = "photo",
}: {
  defaultFocus?: CommunityFocus | "all";
}) {
  const [focus, setFocus] = useState<CommunityFocus | "all">(defaultFocus);

  const list = COMMUNITIES.filter((c) => {
    if (focus === "all") return true;
    // "both" entries are relevant to photo and video alike.
    return c.focus === focus || c.focus === "both";
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Where clients post work
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Communities and boards worth checking directly — especially for
            photo and video briefs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <ChipToggle
              key={f.key}
              active={focus === f.key}
              onClick={() => setFocus(f.key)}
            >
              {f.label}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((c) => (
          <a
            key={c.url}
            href={c.url}
            target="_blank"
            rel="noopener"
            className="card-lift group flex flex-col rounded-xl border border-border bg-card p-5"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="font-display flex items-center gap-1.5 text-lg font-semibold leading-snug">
                {c.name}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </h3>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  PLATFORM_TONE[c.platform] || PLATFORM_TONE.Network
                )}
              >
                {c.platform}
              </span>
            </div>

            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              {c.description}
            </p>

            {c.tip && (
              <p className="mt-auto flex items-start gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs leading-relaxed text-foreground/75">
                <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
                {c.tip}
              </p>
            )}

            <span className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {FOCUS_LABEL[c.focus]}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
