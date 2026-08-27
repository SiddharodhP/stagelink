import type { Metadata } from "next";

// Personal setup flow — never index it.
export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
