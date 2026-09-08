"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, BadgeCheck, Ban, Undo2, Users } from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyCard, SkeletonRows } from "@/components/shared/dashboard-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getAllUsers, setUserFlags } from "@/lib/services/admin";
import { Profile } from "@/types/marketplace";
import { formatDate, cn, displayName } from "@/lib/utils";

function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    getAllUsers().then(({ data }) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.company_name || "").toLowerCase().includes(q)
    );
  });

  const toggle = async (u: Profile, key: "is_verified" | "is_suspended") => {
    const next = !u[key];
    const { error } = await setUserFlags(u.id, { [key]: next });
    if (error) return toast.error(error.message || "Could not update");
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, [key]: next } : x)));
    toast.success(
      key === "is_verified"
        ? next ? "User verified" : "Verification removed"
        : next ? "Account suspended" : "Suspension lifted"
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Admin" title="Users" description="Verify, suspend, and inspect accounts." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-white px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or company…"
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex gap-2">
          {["all", "client", "freelancer", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors",
                roleFilter === r
                  ? "bg-ink text-paper"
                  : "border border-border bg-white text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonRows count={5} height={72} />
      ) : filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="eyebrow px-5 py-3 font-semibold">User</th>
                <th className="eyebrow px-5 py-3 font-semibold">Role</th>
                <th className="eyebrow px-5 py-3 font-semibold">Joined</th>
                <th className="eyebrow px-5 py-3 font-semibold">Status</th>
                <th className="eyebrow px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-secondary/50">
                  <td className="px-5 py-4">
                    <Link href={`/u/${u.id}`} className="flex items-center gap-3 hover:text-brand">
                      <UserAvatar name={displayName(u)} src={u.avatar_url} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{displayName(u)}</p>
                        {u.company_name && (
                          <p className="truncate text-xs text-muted-foreground">{u.company_name}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 capitalize text-muted-foreground">{u.role || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {u.is_verified && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                          Verified
                        </span>
                      )}
                      {u.is_suspended && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700">
                          Suspended
                        </span>
                      )}
                      {!u.is_verified && !u.is_suspended && (
                        <span className="text-xs text-muted-foreground">Standard</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => toggle(u, "is_verified")}
                      >
                        <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                        {u.is_verified ? "Unverify" : "Verify"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "rounded-full",
                          u.is_suspended ? "text-emerald-700" : "text-muted-foreground hover:text-red-600"
                        )}
                        onClick={() => toggle(u, "is_suspended")}
                      >
                        {u.is_suspended ? (
                          <>
                            <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Restore
                          </>
                        ) : (
                          <>
                            <Ban className="mr-1.5 h-3.5 w-3.5" /> Suspend
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyCard icon={Users} title="No users match" description="Try a different search or role filter." />
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return <WorkspaceShell role="admin">{() => <AdminUsers />}</WorkspaceShell>;
}
