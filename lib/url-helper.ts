/**
 * Universal URL resolver for RewardNova.
 * Canonical live production domain is ALWAYS https://www.rewardnova.shop.
 * Local development resolves to localhost:3000.
 */
export const CANONICAL_SITE_URL = "https://www.rewardnova.shop";

export function getAppUrl(headersList?: { get(name: string): string | null }): string {
  // If in local dev environment
  if (process.env.NODE_ENV === "development") {
    if (headersList) {
      const host = headersList.get("x-forwarded-host") || headersList.get("host");
      if (host && (host.includes("localhost") || host.includes("127.0.0.1"))) {
        return `http://${host}`;
      }
    }
    return "http://localhost:3000";
  }

  // Canonical live production domain for RewardNova
  return CANONICAL_SITE_URL;
}

