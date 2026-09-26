import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
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

// GA4 property "Pickulator Web" under the KatchingStacks Analytics account
// (kept its stream ID from when the app was still called "KanPassIt" - the
// stream's site URL was updated to pickulator.com, the measurement ID
// itself doesn't change on a rename). Not a secret: measurement IDs are
// meant to be public, they're embedded client-side in every pageview.
const GA_MEASUREMENT_ID = "G-4FD4X607Z7";

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
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <Suspense fallback={null}>
          <GoogleAnalyticsPageView gaId={GA_MEASUREMENT_ID} />
        </Suspense>
      </body>
    </html>
  );
}
