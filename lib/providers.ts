export interface OfferwallProvider {
  id: string;
  name: string;
  type: "offer" | "survey";
  badge?: string;
  active: boolean;
  urlTemplate: string;
  show_rate: boolean;
  rate: string;
  logo: string;
  description: string;
  color: string;
}

export const DEFAULT_PROVIDERS: OfferwallProvider[] = [
  {
    id: "klink",
    name: "Klink",
    type: "offer",
    badge: "80%",
    active: true,
    urlTemplate: "https://offerwall.klinkfinance.com/wall?pub_id=422&sub_id={user_id}",
    show_rate: true,
    rate: "5",
    logo: "⚡",
    description: "High-paying mobile apps, finance tasks, and instant reward offers.",
    color: "#3b82f6",
  },
  {
    id: "adswedmedia",
    name: "Adswedmedia",
    type: "offer",
    badge: "80%",
    active: true,
    urlTemplate: "https://adswedmedia.com/offer/Na6F5/{user_id}",
    show_rate: true,
    rate: "5",
    logo: "🔥",
    description: "Top-converting CPI, trial signups, and high reward gaming campaigns.",
    color: "#f97316",
  },
  {
    id: "gemlads",
    name: "Gemlads",
    type: "offer",
    badge: "80%",
    active: true,
    urlTemplate: "https://gemlwall.com?placementid=6a60a8G967b94030f&user_id={user_id}",
    show_rate: true,
    rate: "5",
    logo: "💎",
    description: "Premium offer wall with high yield game downloads and signups.",
    color: "#8b5cf6",
  },
  {
    id: "upwall",
    name: "Upwall",
    type: "offer",
    badge: "80%",
    active: true,
    urlTemplate: "https://offerwall.upwall.io/?app_id=b796-8881-51d7&user_id={user_id}",
    show_rate: true,
    rate: "5",
    logo: "🚀",
    description: "Quick tasks, app testing, and fast credit verification.",
    color: "#06b6d4",
  },
  {
    id: "clickwall",
    name: "Clickwall",
    type: "offer",
    badge: "80%",
    active: true,
    urlTemplate: "https://clickwall.net/app/iframe/10889/user_id={user_id}",
    show_rate: true,
    rate: "5",
    logo: "👆",
    description: "Quick PTC ads, shortlinks, video tasks, and instant micropayments.",
    color: "#10b981",
  },
  {
    id: "offery",
    name: "Offery",
    type: "offer",
    badge: "",
    active: true,
    urlTemplate: "https://offery.io/offerwall/dkeebkcr1z3m4ud0or0d4fw?sub_id={user_id}",
    show_rate: false,
    rate: "0/5",
    logo: "🎁",
    description: "Exclusive sweepstakes, surveys, and casual gaming offers.",
    color: "#eab308",
  },
  {
    id: "vortexwall",
    name: "Vortexwall",
    type: "offer",
    badge: "",
    active: true,
    urlTemplate: "https://vortexwall.com/ow/6a8b64813cdebdefe67f6d0c?user_id={user_id}",
    show_rate: false,
    rate: "0/5",
    logo: "🌀",
    description: "Interactive video reward wall and sponsored application installs.",
    color: "#a855f7",
  },
  {
    id: "notik",
    name: "Notik",
    type: "offer",
    badge: "",
    active: true,
    urlTemplate: "https://notik.me/coins?api_key=EsK1MWFnCStLmJ2CJJL&user_id={user_id}",
    show_rate: false,
    rate: "0/5",
    logo: "💎",
    description: "Crypto and web3 task offerwall with guaranteed postback credit.",
    color: "#14b8a6",
  },
];

/**
 * Builds the personalized offerwall launch URL for a given user.
 */
export function getProviderLaunchUrl(provider: OfferwallProvider, userId: string): string {
  return provider.urlTemplate
    .replace("{user_id}", encodeURIComponent(userId))
    .replace("[USER_ID]", encodeURIComponent(userId))
    .replace("{sub_id}", encodeURIComponent(userId));
}
