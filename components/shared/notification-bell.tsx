"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  subscribeToNotifications,
} from "@/lib/services/notifications";
import { AppNotification } from "@/types/marketplace";
import { timeAgo, cn } from "@/lib/utils";

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    getNotifications(userId, 12).then(({ data }) => mounted && setItems(data));
    getUnreadCount(userId).then((c) => mounted && setUnread(c));

    const unsubscribe = subscribeToNotifications(userId, (n) => {
      setItems((prev) => [n, ...prev].slice(0, 12));
      setUnread((c) => c + 1);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [userId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-full border border-border bg-card p-2.5 transition-colors hover:border-foreground/40"
        >
          <Bell className="h-[18px] w-[18px] text-foreground/70" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-display text-base font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => {
                markAllRead(userId);
                setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
                setUnread(0);
              }}
              className="text-xs font-medium text-brand hover:text-brand-deep"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing yet — activity on your projects and bids shows up here.
            </p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.link || "/notifications"}
                onClick={() => {
                  if (!n.is_read) {
                    markRead(n.id);
                    setUnread((c) => Math.max(0, c - 1));
                    setItems((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
                    );
                  }
                }}
                className={cn(
                  "block border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary",
                  !n.is_read && "bg-brand-soft/40"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <Link
          href="/notifications"
          className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-brand hover:text-brand-deep"
        >
          View all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
