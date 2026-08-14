"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyCard, SkeletonRows } from "@/components/shared/dashboard-ui";
import {
  getNotifications,
  markAllRead,
  markRead,
} from "@/lib/services/notifications";
import { AppNotification, Profile } from "@/types/marketplace";
import { timeAgo, cn } from "@/lib/utils";

function NotificationsPage({ profile }: { profile: Profile }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications(profile.id, 60).then(({ data }) => {
      setItems(data);
      setLoading(false);
    });
  }, [profile.id]);

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        description="Everything that happened on your projects, bids, and contracts."
        action={
          unread > 0 ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                markAllRead(profile.id);
                setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
              }}
            >
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <SkeletonRows count={5} height={80} />
      ) : items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {items.map((n) => {
            const inner = (
              <div
                className={cn(
                  "flex items-start gap-3 border-b border-border px-5 py-4 transition-colors last:border-b-0",
                  n.link && "hover:bg-secondary",
                  !n.is_read && "bg-brand-soft/40"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.is_read ? "bg-border" : "bg-brand"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );

            return n.link ? (
              <Link
                key={n.id}
                href={n.link}
                onClick={() => {
                  if (!n.is_read) {
                    markRead(n.id);
                    setItems((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
                    );
                  }
                }}
                className="block"
              >
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={Bell}
          title="No notifications yet"
          description="Bids, milestone updates, payments, and messages will show up here as they happen."
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <WorkspaceShellFree>{(profile) => <NotificationsPage profile={profile} />}</WorkspaceShellFree>
  );
}
