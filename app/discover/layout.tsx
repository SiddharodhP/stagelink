import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Freelance & Contract Work From Around The Web",
  description:
    "Live freelance and contract listings aggregated from Remotive, alongside Roster's own escrow-protected milestone projects. Full-time roles are filtered out.",
  path: "/discover",
  keywords: [
    "freelance contract work",
    "remote freelance listings",
    "contract jobs for freelancers",
    "find freelance work online",
  ],
});

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
