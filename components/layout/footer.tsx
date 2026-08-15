import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-ink pb-8 pt-20 text-paper">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-16 flex flex-col justify-between gap-8 border-b border-white/10 pb-16 md:flex-row md:items-end">
          <div>
            <Link href="/" className="inline-flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold tracking-tight md:text-7xl">
                {APP_NAME}
              </span>
              <span className="mb-2 inline-block h-3 w-3 rounded-full bg-brand" aria-hidden />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
              The freelance marketplace built on structured milestones,
              competitive bidding, and escrow-protected payments.
            </p>
          </div>
          <Link
            href="/projects"
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-medium transition-colors hover:border-brand hover:text-brand"
          >
            Browse open projects
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-10 md:grid-cols-4">
          <div>
            <h3 className="eyebrow mb-4 !text-white/40">Marketplace</h3>
            <ul className="space-y-3">
              <li><Link href="/projects" className="text-sm text-white/60 transition-colors hover:text-white">Browse projects</Link></li>
              <li><Link href="/discover" className="text-sm text-white/60 transition-colors hover:text-white">Discover (external listings)</Link></li>
              <li><Link href="/#how-it-works" className="text-sm text-white/60 transition-colors hover:text-white">How it works</Link></li>
              <li><Link href="/login" className="text-sm text-white/60 transition-colors hover:text-white">Sign in</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4 !text-white/40">For clients</h3>
            <ul className="space-y-3">
              <li><Link href="/projects/new" className="text-sm text-white/60 transition-colors hover:text-white">Post a project</Link></li>
              <li><Link href="/#how-it-works" className="text-sm text-white/60 transition-colors hover:text-white">Milestone payments</Link></li>
              <li><Link href="/login" className="text-sm text-white/60 transition-colors hover:text-white">Client login</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4 !text-white/40">For freelancers</h3>
            <ul className="space-y-3">
              <li><Link href="/projects" className="text-sm text-white/60 transition-colors hover:text-white">Find work</Link></li>
              <li><Link href="/#for-freelancers" className="text-sm text-white/60 transition-colors hover:text-white">Why {APP_NAME}</Link></li>
              <li><Link href="/login" className="text-sm text-white/60 transition-colors hover:text-white">Freelancer login</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4 !text-white/40">Trust</h3>
            <ul className="space-y-3">
              <li><span className="text-sm text-white/60">Escrow-protected payments</span></li>
              <li><span className="text-sm text-white/60">Two-way reviews</span></li>
              <li><span className="text-sm text-white/60">Dispute resolution</span></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-xs text-white/40">
            &copy; {currentYear} {APP_NAME} Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-xs text-white/40 transition-colors hover:text-white">Terms of Service</Link>
            <Link href="/privacy" className="text-xs text-white/40 transition-colors hover:text-white">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
