import type { Metadata } from "next";

// Private workspace — never index. robots.txt blocks crawling, but this
// meta tag is what prevents indexing if the URL is linked from elsewhere.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
