"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Editorial page header used across all workspace pages. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Dashed empty-state card with optional CTA. */
export function EmptyCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-display mb-2 text-xl font-semibold">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-6 rounded-full bg-ink text-paper hover:bg-ink-soft">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button
          onClick={onAction}
          className="mt-6 rounded-full bg-ink text-paper hover:bg-ink-soft"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** Stat tile with a serif number. */
export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className={cn("rounded-xl border border-border bg-white p-5", href && "card-lift")}>
      <div className="mb-4 flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <p className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Consistent labeled field wrapper. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Card section with a title/description header. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-white", className)}>
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export const inputClass =
  "flex h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const selectClass = inputClass;

export const textareaClass =
  "flex min-h-[120px] w-full resize-none rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Multi-select chip group used for skills. */
export function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all",
        active
          ? "border-ink bg-ink text-paper"
          : "border-border bg-white text-foreground/70 hover:border-ink/40"
      )}
    >
      {children}
    </button>
  );
}

/** Skeleton row placeholder. */
export function SkeletonRows({ count = 3, height = 88 }: { count?: number; height?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton w-full rounded-xl" style={{ height }} />
      ))}
    </div>
  );
}
