import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: {
    default: "Roster — Freelance work, structured in milestones",
    template: "%s | Roster",
  },
  description:
    "The freelance marketplace where clients structure projects into milestones, freelancers compete on merit, and every payment is protected by escrow.",
  keywords: [
    "freelance marketplace",
    "hire freelancers",
    "freelance projects",
    "milestone payments",
    "escrow freelance",
    "freelance bidding",
    "remote work",
    "find freelance work",
  ],
  openGraph: {
    title: "Roster — Freelance work, structured in milestones",
    description:
      "Clients define milestones. Freelancers bid on the full picture. Payment is released as each stage is approved.",
    type: "website",
    siteName: "Roster",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrument.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#ffffff",
              border: "1px solid rgba(26, 23, 19, 0.12)",
              color: "#1a1713",
              boxShadow: "0 18px 40px -18px rgba(26, 23, 19, 0.25)",
            },
          }}
        />
      </body>
    </html>
  );
}
