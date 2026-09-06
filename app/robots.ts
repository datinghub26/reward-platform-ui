import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rewardnova.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/earn", "/leaderboard", "/login", "/register"],
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/dashboard",
          "/withdraw",
          "/transactions",
          "/notifications",
          "/referrals",
          "/profile",
          "/account-*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
