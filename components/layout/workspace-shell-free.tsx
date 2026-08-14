"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getMyProfile } from "@/lib/services/auth";
import { Profile } from "@/types/marketplace";
import { APP_NAME } from "@/lib/constants";

/**
 * Workspace chrome for pages any signed-in role can use
 * (settings, messages, notifications, contracts).
 * The sidebar adapts to whichever role the viewer has.
 */
export function WorkspaceShellFree({
  children,
}: {
  children: React.ReactNode | ((profile: Profile) => React.ReactNode);
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    });
  }, [router]);

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block">
        <Sidebar role={profile.role as "client" | "freelancer" | "admin"} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-10">
          <span className="font-display text-lg font-bold md:hidden">{APP_NAME}</span>
          <span className="hidden text-sm text-muted-foreground md:block">
            {profile.full_name || "Complete your profile"}
          </span>
          <div className="flex items-center gap-3">
            <NotificationBell userId={profile.id} />
            <UserAvatar name={profile.full_name || "Me"} src={profile.avatar_url} size={36} />
          </div>
        </div>

        <main className="p-4 md:p-10">
          {typeof children === "function" ? children(profile) : children}
        </main>
      </div>
    </div>
  );
}
