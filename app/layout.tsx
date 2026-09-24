import type { Metadata } from "next";
import { Archivo, Fraunces, Instrument_Sans } from "next/font/google";
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
import { ThemeScript } from "@/components/theme/theme-script";
import { ThemeProvider } from "@/components/theme/theme-provider";

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Poster face for the homepage.
 *
 * A high-contrast display serif over a cream ground is the single most
 * recognisable signature of generated design right now, and Fraunces on
 * #f7f4ee is exactly that. Archivo at its widest is a grotesque with the
 * proportions of exhibition signage and lens-barrel engraving -- it leaves
 * the cluster without touching the palette the photographs are graded to.
 *
 * Fraunces stays loaded: thirty-odd other pages still set font-display.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
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
    // suppressHydrationWarning because the theme script may add `light`
    // to this element before React hydrates, which React would otherwise
    // report as a server/client mismatch on the class attribute.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrument.variable} ${fraunces.variable} ${archivo.variable}`}
    >
      <head>
        {/* First thing in <head>: it has to run before the first paint. */}
        <ThemeScript />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          {children}
          {/* Sonner renders outside the app tree and takes inline styles, so
              it reads the raw variables rather than Tailwind utilities. */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--popover)",
                border: "1px solid var(--border)",
                color: "var(--popover-fg)",
                boxShadow: "0 18px 40px -18px var(--card-shadow)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
