import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// City pages under this route define their own generateMetadata, which
// takes precedence over this default.
export const metadata: Metadata = buildMetadata({
  title: "Hire Photographers & Videographers — Freelance Directory",
  description:
    "Browse freelance photographers, videographers, editors and drone operators across India. Filter by city, craft, rate and availability. Milestone payments held in escrow until you approve the work.",
  path: "/people",
  keywords: [
    "hire freelance photographer",
    "hire videographer india",
    "freelance photographer directory",
    "wedding photographer near me",
    "product photography freelancer",
    "video editor freelance india",
    "drone operator hire",
  ],
});

export default function FreelancersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
