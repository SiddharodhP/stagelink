import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sign In or Create an Account",
  description:
    "Sign in to Jayree to post freelance projects with milestone payments, or to bid on escrow-protected work as a freelancer.",
  path: "/login",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
