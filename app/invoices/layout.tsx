import type { Metadata } from "next";

// Invoices are private financial documents — names, amounts, company details.
// Never index them, and never let a crawler follow links out of one.
export const metadata: Metadata = {
  title: "Invoices",
  robots: { index: false, follow: false, nocache: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
