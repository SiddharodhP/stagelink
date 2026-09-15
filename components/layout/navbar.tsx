"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard, MessageSquare, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { APP_NAME, NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { getMyProfile, signOut } from "@/lib/services/auth";
import { Profile } from "@/types/marketplace";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [overDarkHero, setOverDarkHero] = useState(false);

  /**
   * Two things tracked, not one.
   *
   * isScrolled decides whether the bar wears its paper background. overDarkHero
   * asks whether the bar is currently sitting on top of a dark hero image --
   * measured off the element itself rather than guessed from a scroll offset,
   * because the hero's height is in viewport units and changes with the window.
   *
   * Pages without a [data-dark-hero] section never set it, so their navbar
   * behaves exactly as it always has.
   */
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-dark-hero]");
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
      setOverDarkHero(hero ? hero.getBoundingClientRect().bottom > 96 : false);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [pathname]);

  useEffect(() => {
    getMyProfile().then(({ data }) => setProfile(data));
  }, []);

  const dashboardHref =
    profile?.role === "client"
      ? "/client/dashboard"
      : profile?.role === "admin"
        ? "/admin"
        : "/freelancer/dashboard";

  /**
   * The homepage now opens on an ink hero, and this bar is transparent until
   * you scroll -- so ink-on-ink made the logo and every link invisible. On
   * that one page, while unscrolled, the bar inverts. The moment it gains its
   * paper background on scroll, the normal ink text is correct again.
   */
  const onDarkHero = overDarkHero;

  /**
   * Over the hero photograph, once you have started scrolling, the bar leaves.
   *
   * It used to swap to its paper background the moment you moved, which laid a
   * bright strip straight across the image. Sliding it out is what the
   * reference does, and it comes back on its own -- with the paper bar and
   * normal ink text -- as soon as the hero has passed.
   */
  const hidden = overDarkHero && isScrolled;

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        hidden ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100"
      } ${
        isScrolled && !overDarkHero
          ? "border-b border-border bg-background/90 py-3 backdrop-blur-md"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span
            className={`font-display text-[26px] font-bold leading-none tracking-tight ${
              onDarkHero ? "text-paper" : ""
            }`}
          >
            {APP_NAME}
          </span>
          <span className="mb-0.5 inline-block h-2 w-2 rounded-full bg-brand" aria-hidden />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-brand ${
                pathname === link.href
                  ? "text-brand"
                  : onDarkHero
                    ? "text-paper/75 hover:text-paper"
                    : "text-foreground/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {profile ? (
            <>
              <NotificationBell userId={profile.id} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full transition-transform hover:scale-105">
                    <UserAvatar name={profile.full_name || "Me"} src={profile.avatar_url} size={40} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-semibold leading-none">
                      {profile.full_name || "Account"}
                    </p>
                    <p className="mt-1 text-xs capitalize leading-none text-muted-foreground">
                      {profile.role || "unassigned"}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashboardHref} className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="cursor-pointer">
                      <MessageSquare className="mr-2 h-4 w-4" /> Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/u/${profile.id}`} className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" /> Public profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className={
                  onDarkHero
                    ? "text-paper/75 hover:bg-paper/10 hover:text-paper"
                    : "text-foreground/70 hover:text-foreground"
                }
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className={
                  onDarkHero
                    ? "rounded-full bg-paper px-6 text-ink hover:bg-white"
                    : "rounded-full bg-ink px-6 text-paper hover:bg-ink-soft"
                }
              >
                <Link href="/login">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className={`md:hidden ${
            onDarkHero
              ? "text-paper/80 hover:text-paper"
              : "text-foreground/70 hover:text-foreground"
          }`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border bg-background md:hidden"
          >
            <div className="flex flex-col space-y-4 px-4 py-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-b border-border py-2 text-lg font-medium text-foreground/80 hover:text-brand"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4">
                {profile ? (
                  <>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link href={dashboardHref} onClick={() => setMobileMenuOpen(false)}>
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-destructive"
                      onClick={() => { setMobileMenuOpen(false); signOut(); }}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                    </Button>
                    <Button asChild className="w-full rounded-full bg-ink text-paper hover:bg-ink-soft">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
