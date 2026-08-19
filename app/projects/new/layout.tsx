import type { Metadata } from "next";

// Authenticated action page — no search value, keep it out of the index.
export const metadata: Metadata = {
  title: "Post a project",
  robots: { index: false, follow: false, nocache: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
