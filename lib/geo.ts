import { headers } from "next/headers";
export * from "./geo-utils";

export type ClientGeo = {
  ip: string;
  countryCode: string;
};

// Extract client IP & Country from request headers with external lookup fallback
export async function getClientGeo(): Promise<ClientGeo> {
  let headerList;
  try {
    headerList = await headers();
  } catch {
    headerList = null;
  }

  // 1. Check Cloudflare, Vercel, or custom CDN country headers
  const cfCountry = headerList?.get("cf-ipcountry");
  const vercelCountry = headerList?.get("x-vercel-ip-country");
  const customCountry = headerList?.get("x-country-code");
  const headerCountry = cfCountry || vercelCountry || customCountry;

  // 2. Extract Client IP
  const cfIp = headerList?.get("cf-connecting-ip");
  const realIp = headerList?.get("x-real-ip");
  const forwarded = headerList?.get("x-forwarded-for");
  const parsedForwarded = forwarded ? forwarded.split(",")[0].trim() : null;

  const ip = cfIp || realIp || parsedForwarded || "127.0.0.1";

  // If header provided a valid 2-letter ISO country (excluding Cloudflare 'XX' or 'T1' pseudo-codes)
  if (
    headerCountry &&
    headerCountry.length === 2 &&
    headerCountry !== "XX" &&
    headerCountry !== "T1"
  ) {
    return {
      ip,
      countryCode: headerCountry.toUpperCase(),
    };
  }

  // 3. If running on public IP, lookup IP geo via lightweight API
  const isPrivateOrLoopback =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.31.");

  if (!isPrivateOrLoopback) {
    try {
      const res = await fetch(`https://api.country.is/${ip}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.country && typeof data.country === "string") {
          return {
            ip,
            countryCode: data.country.toUpperCase(),
          };
        }
      }
    } catch (e) {
      console.warn("External IP geo lookup failed for IP:", ip, e);
    }
  }

  // 4. If on local machine / dev environment, lookup current machine's external IP
  try {
    const res = await fetch("https://api.country.is/", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.country && typeof data.country === "string") {
        return {
          ip: data.ip || ip,
          countryCode: data.country.toUpperCase(),
        };
      }
    }
  } catch (e) {
    console.warn("External machine geo lookup failed:", e);
  }

  // 5. Ultimate fallback
  return {
    ip,
    countryCode: "US",
  };
}
