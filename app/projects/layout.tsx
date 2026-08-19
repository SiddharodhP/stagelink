import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Browse Freelance Projects — Milestone-Based & Escrow Protected",
  description:
    "Browse open freelance projects with fixed milestone budgets. See every deliverable, deadline, and payment amount before you bid — and get paid per approved milestone through escrow.",
  path: "/projects",
  keywords: [
    "freelance projects",
    "freelance jobs with milestone payments",
    "bid on freelance projects",
    "escrow protected freelance work",
    "remote freelance projects India",
  ],
});

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
