"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  User, 
  Image as ImageIcon, 
  Calendar, 
  Inbox, 
  MessageSquare,
  LogOut,
  Music
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { signOut } from "@/lib/services/auth";

interface SidebarProps {
  role: "musician" | "organizer";
  className?: string;
}

export function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname();

  const musicianLinks = [
    { href: "/musician/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/musician/profile", label: "Profile", icon: User },
    { href: "/musician/media", label: "Media Gallery", icon: ImageIcon },
    { href: "/musician/availability", label: "Availability", icon: Calendar },
    { href: "/musician/inquiries", label: "Inquiries", icon: Inbox },
    { href: "/musician/messages", label: "Messages", icon: MessageSquare },
  ];

  const organizerLinks = [
    { href: "/organizer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/organizer/profile", label: "Profile", icon: User },
    { href: "/organizer/inquiries", label: "Inquiries", icon: Inbox },
    { href: "/organizer/saved", label: "Saved Artists", icon: User },
    { href: "/organizer/messages", label: "Messages", icon: MessageSquare },
  ];

  const links = role === "musician" ? musicianLinks : organizerLinks;

  return (
    <div className={cn("flex h-screen w-64 flex-col bg-black border-r border-white/10", className)}>
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Music className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">{APP_NAME}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent"
                )}
              >
                <link.icon className={cn("h-5 w-5", isActive ? "text-purple-400" : "text-zinc-400")} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
          onClick={() => signOut()}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Log out
        </Button>
      </div>
    </div>
  );
}
