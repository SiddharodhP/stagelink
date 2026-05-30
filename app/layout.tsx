import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StageLink — Find the Perfect Sound for Your Event",
    template: "%s | StageLink",
  },
  description:
    "Discover live musicians, bands, DJs, and performers for weddings, college fests, corporate events, and unforgettable nights.",
  keywords: [
    "musicians",
    "bands",
    "DJs",
    "live music",
    "event booking",
    "wedding music",
    "corporate events",
    "performers",
  ],
  openGraph: {
    title: "StageLink — Find the Perfect Sound for Your Event",
    description:
      "Discover live musicians, bands, DJs, and performers for weddings, college fests, corporate events, and unforgettable nights.",
    type: "website",
    siteName: "StageLink",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(17, 17, 17, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ededed",
              backdropFilter: "blur(16px)",
            },
          }}
        />
      </body>
    </html>
  );
}
