"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Briefcase,
  Gavel,
  MessageSquare,
  LogOut,
  Heart,
  Compass,
  ArrowUpRight,
  Wallet,
  Images,
  PlusCircle,
  Users,
  ShieldAlert,
  Flag,
  FileSignature,
  Globe2,
  Receipt,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { signOut } from "@/lib/services/auth";

interface SidebarProps {
  role: "client" | "freelancer" | "admin";
  className?: string;
}

export function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname();

  const clientLinks = [
    { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/client/projects", label: "My projects", icon: Briefcase },
    { href: "/projects/new", label: "Post a project", icon: PlusCircle },
    { href: "/client/contracts", label: "Contracts", icon: FileSignature },
    { href: "/client/payments", label: "Payments", icon: Wallet },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/settings/profile", label: "Profile", icon: User },
  ];

  const freelancerLinks = [
    { href: "/freelancer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Find work", icon: Compass },
    { href: "/discover", label: "Discover (external)", icon: Globe2 },
    { href: "/freelancer/bids", label: "My bids", icon: Gavel },
    { href: "/freelancer/contracts", label: "Contracts", icon: FileSignature },
    { href: "/freelancer/saved", label: "Saved projects", icon: Heart },
    { href: "/freelancer/earnings", label: "Earnings", icon: Wallet },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/freelancer/portfolio", label: "Portfolio", icon: Images },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/settings/profile", label: "Profile", icon: User },
  ];

  const adminLinks = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/disputes", label: "Disputes", icon: ShieldAlert },
    { href: "/admin/reports", label: "Reports", icon: Flag },
  ];

  const links =
    role === "client" ? clientLinks : role === "admin" ? adminLinks : freelancerLinks;
  const sectionLabel =
    role === "client" ? "Client workspace" : role === "admin" ? "Admin" : "Freelancer workspace";

  return (
    <div
      className={cn(
        "flex h-screen w-64 flex-col border-r border-border bg-white",
        className
      )}
    >
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-display text-[22px] font-bold leading-none tracking-tight">
            {APP_NAME}
          </span>
          <span className="mb-0.5 inline-block h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="eyebrow mb-3 px-3">{sectionLabel}</p>
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/projects" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-ink text-paper"
                    : "text-foreground/65 hover:bg-secondary hover:text-foreground"
                )}
              >
                <link.icon
                  className={cn("h-[18px] w-[18px]", isActive ? "text-paper" : "text-foreground/50")}
                />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {role === "client" && (
          <div className="mt-8 rounded-xl border border-border bg-brand-soft p-4">
            <p className="mb-1 text-sm font-semibold">Ready to hire?</p>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Post a project with milestones and let freelancers compete for it.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-deep"
            >
              Post a project <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/65 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </div>
  );
}
