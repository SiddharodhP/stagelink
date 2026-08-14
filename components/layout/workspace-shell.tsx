"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getMyProfile } from "@/lib/services/auth";
import { Profile, MarketplaceRole } from "@/types/marketplace";
import { APP_NAME } from "@/lib/constants";

/**
 * Authenticated workspace chrome: sidebar + top bar, with a role guard.
 * Middleware already blocks anonymous users; this enforces the *right* role
 * and gives the page its profile without every page re-fetching it.
 */
export function WorkspaceShell({
  role,
  children,
}: {
  role: MarketplaceRole;
  children: (profile: Profile) => React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    getMyProfile().then(({ data }) => {
      if (!data) {
        router.push("/login");
        return;
      }
      if (!data.role) {
        router.push("/auth/role-select");
        return;
      }
      setProfile(data);
      setState(data.role === role ? "ok" : "denied");
    });
  }, [role, router]);

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (state === "denied" || !profile) {
    const home =
      profile?.role === "client"
        ? "/client/dashboard"
        : profile?.role === "admin"
          ? "/admin"
          : "/freelancer/dashboard";
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <p className="eyebrow mb-3">Permission denied</p>
        <h1 className="font-display mb-3 text-3xl font-semibold">
          This area isn&apos;t part of your workspace
        </h1>
        <p className="mb-6 max-w-md text-muted-foreground">
          You&apos;re signed in as a {profile?.role ?? "user"}. Head back to your
          own dashboard to continue.
        </p>
        <a
          href={home}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink-soft"
        >
          Go to my dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block">
        <Sidebar role={profile.role as "client" | "freelancer" | "admin"} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-10">
          <span className="font-display text-lg font-bold md:hidden">
            {APP_NAME}
          </span>
          <span className="hidden text-sm text-muted-foreground md:block">
            {profile.full_name || "Complete your profile"}
          </span>
          <div className="flex items-center gap-3">
            <NotificationBell userId={profile.id} />
            <UserAvatar name={profile.full_name || "Me"} src={profile.avatar_url} size={36} />
          </div>
        </div>

        <main className="p-4 md:p-10">{children(profile)}</main>
      </div>
    </div>
  );
}
