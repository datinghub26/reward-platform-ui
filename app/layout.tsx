import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import PointCreditListener from "@/components/PointCreditListener";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://rewardnova.com"),
  title: {
    default: "RewardNova — Earn Real Cash, Crypto & Rewards Online",
    template: "%s | RewardNova",
  },
  description:
    "Join RewardNova to earn real cash, crypto, gift cards and points by completing offers, surveys, mobile games, and participating in leaderboard competitions.",
  keywords: [
    "RewardNova",
    "earn rewards online",
    "crypto rewards",
    "paid surveys",
    "cashout PayPal",
    "instant crypto withdrawal",
    "earn money playing games",
    "offerwall tasks",
  ],
  authors: [{ name: "RewardNova Team" }],
  creator: "RewardNova",
  publisher: "RewardNova",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rewardnova.com",
    siteName: "RewardNova",
    title: "RewardNova — Earn Real Cash, Crypto & Rewards Online",
    description:
      "Join RewardNova to earn real cash, crypto, gift cards and points by completing offers, surveys, and mobile games.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RewardNova — Earn Real Cash, Crypto & Rewards Online",
    description:
      "Earn real money and crypto rewards with high-paying surveys, offerwalls, and leaderboard prizes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <Suspense fallback={null}>
          <PointCreditListener />
        </Suspense>
        {children}
      </body>
    </html>
  );
}