import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  PRIMARY_KEYWORDS,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";

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
  // Makes every relative canonical/OG URL resolve against the real domain.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Hire Freelancers With Milestone-Based Escrow Payments`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: PRIMARY_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Hire Freelancers With Milestone-Based Escrow Payments`,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Hire Freelancers With Milestone-Based Escrow Payments`,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "business",
  // Add your Search Console HTML-tag token here if you verify by meta tag
  // instead of by DNS record:
  // verification: { google: "your-token" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrument.variable} ${fraunces.variable}`}>
      <head>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
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
