import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import { AnalyticsConsent } from "./_components/AnalyticsConsent";
import { GoogleAnalyticsPageView } from "./_components/GoogleAnalyticsPageView";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const APP_URL = "https://pickulator.com";
const APP_DESCRIPTION = "The AI-powered way your group decides where to eat.";

// GA4 property "Pickulator" (its own property under the KatchingStacks
// Analytics account, separate from "KanPassIt", which now tracks
// kanpassit.com on its own stream). Not a secret: measurement IDs are
// meant to be public, they're embedded client-side in every pageview.
const GA_MEASUREMENT_ID = "G-2NEWHK9ZZS";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Pickulator",
  description: APP_DESCRIPTION,
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Pickulator",
    description: APP_DESCRIPTION,
    url: APP_URL,
    siteName: "Pickulator",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pickulator",
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:border-2 focus:border-primary focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1} className="w-full flex-1 flex flex-col focus:outline-none">
          {children}
        </main>
        <AnalyticsConsent gaId={GA_MEASUREMENT_ID} />
        <Suspense fallback={null}>
          <GoogleAnalyticsPageView gaId={GA_MEASUREMENT_ID} />
        </Suspense>
      </body>
    </html>
  );
}
