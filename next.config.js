/** @type {import('next').NextConfig} */
const devApiProxyTarget = process.env.DEV_API_PROXY_TARGET?.trim().replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  outputFileTracingExcludes: {
    "/*": [
      "./2323/**/*",
      "./docs/**/*",
      "./.git/**/*",
      "./repomix-output.xml",
      "./REHBER.html",
      "./index.html",
    ],
  },

  // ─── HTTPS redirect (production only) ────────────────────────────────────
  async redirects() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: "https://medasi.com.tr/:path*",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    if (process.env.NODE_ENV !== "development" || !devApiProxyTarget) return [];
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${devApiProxyTarget}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // ─── Security & performance headers ──────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Force HTTPS for 1 year (production only — harmless in dev)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Control referrer leakage
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Basic permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          // Content Security Policy — allows Supabase, Google AI, inline styles
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://medasi.com.tr https://www.medasi.com.tr https://*.supabase.co https://generativelanguage.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com wss://*.supabase.co",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ─── Image optimisation ───────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
};

module.exports = nextConfig;
