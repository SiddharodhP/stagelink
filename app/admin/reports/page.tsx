"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Flag, Ban, Check, ArrowUpRight } from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyCard, SkeletonRows } from "@/components/shared/dashboard-ui";
import { getReports, closeReport, setUserFlags } from "@/lib/services/admin";
import { formatDate, cn, displayName } from "@/lib/utils";

function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    getReports().then(({ data }) => {
      setReports(data);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const suspend = async (userId: string) => {
    const { error } = await setUserFlags(userId, { is_suspended: true });
    if (error) return toast.error(error.message || "Could not suspend");
    toast.success("Account suspended");
    load();
  };

  const dismiss = async (id: string) => {
    const { error } = await closeReport(id);
    if (error) return toast.error(error.message || "Could not close");
    toast.success("Report closed");
    load();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Admin"
        title="User reports"
        description="Reports submitted by members about other accounts."
      />

      {loading ? (
        <SkeletonRows count={3} height={120} />
      ) : reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2.5">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
                        r.status === "open"
                          ? "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300"
                          : "border-border bg-secondary text-foreground/70"
                      )}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold leading-snug">{r.reason}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Link href={`/u/${r.reported?.id}`} className="font-medium hover:text-brand">
                      {displayName(r.reported)}
                    </Link>{" "}
                    ({r.reported?.role}) · reported by {displayName(r.reporter)}
                  </p>
                </div>
                {r.reported?.is_suspended && (
                  <span className="rounded-full border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
                    Suspended
                  </span>
                )}
              </div>

              {r.details && (
                <p className="mb-4 rounded-lg bg-secondary p-4 text-sm leading-relaxed text-foreground/85">
                  {r.details}
                </p>
              )}

              {r.status === "open" && (
                <div className="flex flex-wrap gap-2">
                  {!r.reported?.is_suspended && (
                    <Button
                      size="sm"
                      className="rounded-full bg-red-600 text-white hover:bg-red-700"
                      onClick={() => suspend(r.reported.id)}
                    >
                      <Ban className="mr-1.5 h-3.5 w-3.5" /> Suspend account
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => dismiss(r.id)}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Close report
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="rounded-full text-muted-foreground">
                    <Link href={`/u/${r.reported?.id}`}>
                      View profile <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyCard
          icon={Flag}
          title="No reports"
          description="Reports submitted from user profiles will appear here for moderation."
        />
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return <WorkspaceShell role="admin">{() => <AdminReports />}</WorkspaceShell>;
}
