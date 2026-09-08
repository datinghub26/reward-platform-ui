import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/postback",
        destination: "/api/postback",
      },
      {
        source: "/api/postback/",
        destination: "/api/postback",
      },
      {
        source: "/postback/",
        destination: "/api/postback",
      },
      {
        source: "/api/postbacks",
        destination: "/api/postback",
      },
      {
        source: "/api/postback/clickwall",
        destination: "/api/postback",
      },
      {
        source: "/postback/clickwall",
        destination: "/api/postback",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;