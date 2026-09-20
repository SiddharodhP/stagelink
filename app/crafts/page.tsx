import type { Metadata } from "next";
import { CraftDeck } from "@/components/shared/craft-deck";

/**
 * Preview surface for the craft deck.
 *
 * The deck is an interactive component -- scroll, drag, hover, click -- so it
 * cannot be judged from a screenshot. This gives it somewhere to be tried
 * before a decision about where it belongs.
 *
 * noindex while it is a preview: it duplicates /projects/category/* for search
 * engines and has no content of its own worth ranking.
 */
export const metadata: Metadata = {
  title: "Browse by craft",
  robots: { index: false, follow: false },
};

export default function CraftsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#e9e4db] py-10">
      <CraftDeck />
    </main>
  );
}
