/**
 * Universal URL resolver for RewardNova.
 * Resolves the true live domain (rewardnova.shop) in production and Vercel environments,
 * while respecting local development.
 */
export function getAppUrl(headersList?: { get(name: string): string | null }): string {
  if (headersList) {
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`;
    }
  }

  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // If in local dev environment
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // Default to production domain
  return "https://www.rewardnova.shop";
}
