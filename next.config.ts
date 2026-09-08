import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
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
      {
        source: "/api/postback/nexowall",
        destination: "/api/postback",
      },
      {
        source: "/postback/nexowall",
        destination: "/api/postback",
      },
      {
        source: "/api/postback/gemiads",
        destination: "/api/postback",
      },
      {
        source: "/postback/gemiads",
        destination: "/api/postback",
      },
      {
        source: "/api/postback/adswedmedia",
        destination: "/api/postback",
      },
      {
        source: "/postback/adswedmedia",
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
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;